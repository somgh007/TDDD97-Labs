import sqlite3 
from flask import g

DATABASE_URI = 'database.db'

def get_db():
    db = getattr(g, 'db', None)
    if db is None:
         db = g.db = sqlite3.connect(DATABASE_URI)
    return db

def disconnect_db():
    db = getattr(g, 'db, None')
    if db is None:
        g.db.close()
        g.db = None

def save_user(email, password, first_name, family_name, gender, country, city):
    try: 
        get_db().execute("insert into users values(?,?,?,?,?,?,?);", [email, password, first_name, family_name, gender, country, city])
        get_db().commit()
    except:
        return False
    return True

def update_password(email, password):
    try:
        get_db().execute("update users set password = ? where email = ?;", [password, email])
        get_db().commit()
        return True
    except NameError:
        print(NameError)
    except: 
        print("Error")
    return False

def get_user(email):
    cursor = get_db().execute("select * from users where email like ?", [email])
    rows = cursor.fetchall()
    cursor.close()
    result = []
    for index in range(len(rows)):
        result.append({'email': rows[index][0], 'password': rows[index][1], 'first_name': rows[index][2],  'family_name': rows[index][3],  'gender': rows[index][4],  'country': rows[index][5],  'city': rows[index][6]})
    return result

def get_user_messages_by_email(email):
    cursor = get_db().execute("select * from messages where email like ?", [email])
    rows = cursor.fetchall()
    cursor.close()
    result = []
    for index in range(len(rows)):
        result.append({'email': rows[index][0], 'writer': rows[index][1], 'message': rows[index][2]})
    return result

def post_message(email, writer, message):
    try: 
        get_db().execute("insert into messages values(?,?,?);", [email, writer, message])
        get_db().commit()
    except:
        return False
    return True

