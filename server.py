from flask import Flask, jsonify,render_template,send_from_directory
from flask import request
from random import *
import database_handler
import json
from flask import make_response
from gevent.pywsgi import WSGIServer
from flask_socketio import SocketIO, send, emit,join_room, leave_room
# from flask_sockets import Sockets

app = Flask(__name__, static_url_path='/static')

# sockets = Sockets(app)
socketio = SocketIO(app)

class User(object):
    email = ""
    token = ""

    def __init__(self, email, token):
        self.email = email
        self.token = token

LOGGED_IN_USERS = []

@socketio.on('message')
def handle_message(data):
    print(data['data'])

@socketio.on('subscribe')
def handle_reconnect(data):
    print("Reconnecting user in room...")
    print(data)
    join_room(data)
    
@socketio.on('login')
def handle_login(data):
    token = data['data']
    print('User logged in:')
    print(token)
    print("Sending logout message to previous instances...")
    socketio.emit('logout', room=token)
    print("Saving user in room...")
    join_room(token)
        

@app.route("/")
def root():
    response = make_response(render_template('index.html'))
    return response

@app.route("/welcome", methods=["GET"])
def welcome():
    response = app.response_class(
        status=200
    )
    return response

@app.route("/home", methods=["GET"])
def home():
    response = make_response(render_template('index.html'))
    return response

@app.route("/browse", methods=["GET"])
def browse():
    response = make_response(render_template('index.html'))
    return response

@app.route("/profile", methods=["GET"])
def profile():
    response = make_response(render_template('index.html'))
    return response

def create_sign_in_token(email):
    letters = "abcdefghiklmnopqrstuvwwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    token = "";
    for index in range(len(letters)):
        token += letters[randint(0, len(letters)-1)]
    user = User(email,token)
    LOGGED_IN_USERS.append(user)
    return user

def get_user_data(token):
    for i, user in enumerate(LOGGED_IN_USERS):
        if token == user.token:
            user = database_handler.get_user(user.email)
            user[0]['password'] = ""
            return user[0]
    return False

@app.route("/api/signin", methods=["POST"])
def sign_in():
    data = request.get_json()
    email = data['email']
    password = data['password']
    # TODO: check if user is signed in
    if email and password:
        # 1. Get user information
        user = database_handler.get_user(email)
        if user:
            if password == user[0]['password']:
                for index, user in enumerate(LOGGED_IN_USERS):
                    if email == user.email:
                        response = app.response_class(
                            status=200,
                            mimetype='application/json',
                            headers={'Authorization': user.token}
                        )
                        return response

                user = create_sign_in_token(email)
                response = app.response_class(
                    status=200,
                    mimetype='application/json',
                    headers={'Authorization': user.token}
                )
                return response
    return app.response_class(status=401)

@app.route("/api/signup", methods=["POST"])
def sign_up():
    data = request.get_json()
    email = data['email']
    password = data['password']
    first_name = data['first_name']
    family_name = data['family_name']
    gender = data['gender']
    country = data['country']
    city = data['city']

    if email and password and first_name and family_name and gender and country and city and len(password) > 7:
        # 1. Check if user exist
        user = database_handler.get_user(email)
        if not user:
            result = database_handler.save_user(email, password, first_name, family_name, gender, country, city)
            if result:
                user = create_sign_in_token(email)
                data = {'success': 'true', 'message': 'Successfully logged in'} 
                response = app.response_class(
                    response=json.dumps(data),
                    status=201,
                    mimetype='application/json',
                    headers={'Authorization': user.token}
                )
                return response
        else:
            return app.response_class(status=403) # user exists

    return app.response_class(status=401)

@app.route("/api/updatepassword", methods=["POST"])
def update_password():
    # Get from post message
    data = request.get_json()
    token = request.headers.get("Authorization")
    old_password = data['old_password']
    password = data['password']

    # If they exist
    if token and old_password and password and len(password) > 7:
        # Go through all logged in users
        for i, user in enumerate(LOGGED_IN_USERS):
            # If the user is logged in
            if token == user.token:
                # Update password
                result = database_handler.update_password(user.email, password)
                if result:
                    return app.response_class(status=201)

    return app.response_class(status=401)

@app.route("/api/signout", methods=["POST"])
def sign_out():
    token = request.headers.get("Authorization")
    print(LOGGED_IN_USERS)
    for i, user in enumerate(LOGGED_IN_USERS):
        if token == user.token:
            LOGGED_IN_USERS.pop(i)
            return app.response_class(status=204)

    return app.response_class(status=401)

@app.route("/api/user-by-token/", methods=["POST"])
def get_user_data_by_token():
    token = request.headers.get("Authorization")
    result = get_user_data(token)
    if result:
        response = app.response_class(
            response=json.dumps(result),
            status=200,
            mimetype='application/json'
        )
        return response
    return app.response_class(status=401)

@app.route("/api/user-by-email", methods=["POST"])
def get_user_data_by_email():
    data = request.get_json()
    token = request.headers.get("Authorization")
    email = data['email']

    if get_user_data(token):
        result = database_handler.get_user(email)
        if result:
            result[0]['password'] = ""
            response = app.response_class(
                response=json.dumps(result[0]),
                status=200,
                mimetype='application/json'
            )
            return response
        else:
            return app.response_class(status=500) # no such user
    return app.response_class(status=401)

@app.route("/api/get-messages-by-token", methods=["POST"])
def get_user_messages_by_token():
    token = request.headers.get("Authorization")
    logged_in = get_user_data(token)
    if logged_in: 
        result = database_handler.get_user_messages_by_email(logged_in['email'])
        print('yes')
        if len(result) != 0:
            response = app.response_class(
                response=json.dumps(result),
                status=200,
                mimetype='application/json'
            )
            return response
        else: 
            return app.response_class(status=204)
    return app.response_class(status=401)

@app.route("/api/get-messages-by-email", methods=["POST"])
def get_user_messages_by_email():
    #email = request.args.get('email')
    data = request.get_json()
    email = data['email']
    token = request.headers.get("Authorization")
    logged_in = get_user_data(token)
    if logged_in:
        result = database_handler.get_user_messages_by_email(email)
        if result:
            response = app.response_class(
                response=json.dumps(result),
                status=200,
                mimetype='application/json'
            )
            return response
        else: 
            return app.response_class(status=204)
    return app.response_class(status=401)

@app.route("/api/post-message", methods=["POST"])
def post_message():
    data = request.get_json()
    email = data['email']
    message = data['message']
    token = request.headers.get("Authorization")
    logged_in = get_user_data(token)
    if logged_in:
        print(logged_in)
        writer = logged_in['email']
        result = database_handler.post_message(email, writer, message)
        if result:
            return app.response_class(status=201)
        else:
            return app.response_class(status=500)
    return app.response_class(status=401)

if __name__ == "__main__":
    # app.run(host="192.168.0.102", port=5000, debug=True)
    from gevent import pywsgi
    from geventwebsocket.handler import WebSocketHandler

    app.debug = True
    http_server = WSGIServer(('', 5001), app, handler_class=WebSocketHandler)
    http_server.serve_forever()
    socketio.run(app)