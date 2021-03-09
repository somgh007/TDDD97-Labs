var currentPanel = 'home'
var browseUser = ''

function displayViewNew(view_name) {
    var view, dynamicContent

    view = document.getElementById('profileview')
    dynamicContent = document.getElementById('dynamic-content')
    dynamicContent.innerHTML = view.innerHTML;

    if (view_name == 'login') {
        view = document.getElementById('welcomeview')
        dynamicContent = document.getElementById('dynamic-content')
        dynamicContent.innerHTML = view.innerHTML;
    } else if (view_name == 'home') {
        switchTab('home-panel')
    } else if (view_name == 'browse') {
        switchTab('browse-panel')
    } else if (view_name == 'profile') {
        switchTab('profile-panel')
    }
}

// get user token and email from logged in user
function getLoggedInUserTokenEmail() {
    var currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if(currentUser == null) {
        page('/login')
        return {
            token: "",
            email: ""
        }
    }

    // return object
    return {
        token: currentUser.token,
        email: currentUser.email
    }
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text/plain", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    ev.target.value = document.getElementById(data).innerHTML;
}

// used in home and browse to show user content
function displayUserWall(email) {
    // get the token of the logged in user
    var token = getLoggedInUserTokenEmail().token

    if(currentPanel == 'browse'){
        browseUser = email
    }
    
    if (email !== undefined && email.length > 0 && token.length > 0) {
        var xhr = new XMLHttpRequest();
        var json = {
            email: email
        }
        xhr.open('POST', '/api/user-by-email', true);
        xhr.setRequestHeader("Authorization", token)
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xhr.send(JSON.stringify(json));

        xhr.onload = function (e) {
            // if the user exists
            if (xhr.status == 200) {
                let userData = JSON.parse(xhr.responseText)
                document.getElementById('noUserFoundError').innerHTML = ""
                document.getElementById('postMessageForm').style.display = "block"
                document.getElementById("browseInformation").style.display = "block"
                document.getElementById(currentPanel + 'Name').innerHTML = userData.first_name
                document.getElementById(currentPanel + 'Family').innerHTML = userData.family_name
                document.getElementById(currentPanel + 'Email').innerHTML = userData.email
                document.getElementById(currentPanel + 'City').innerHTML = userData.city
                document.getElementById(currentPanel + 'Gender').innerHTML = userData.gender
                document.getElementById(currentPanel + 'Country').innerHTML = userData.country

                xhr = new XMLHttpRequest();
                var json2 = {
                    email: email
                }
                xhr.open('POST', '/api/get-messages-by-email', true);
                xhr.setRequestHeader("Authorization", token)
                xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                xhr.send(JSON.stringify(json2));

                var messages;
                xhr.onload = function () {
                    // if we got messages back
                    if (xhr.status == 200) {
                        let returnData = JSON.parse(xhr.responseText)
                        if (returnData.length > 0) {
                            messages = document.getElementById(currentPanel + 'Messages')

                            // clear messages on wall
                            messages.innerHTML = ""

                            // go through all messages for the user
                            returnData.forEach((message,i) => {
                                var p = document.createElement("p");
                                p.id = i
                                p.draggable = "true"
                                p.addEventListener('dragstart', drag);
                                p.innerText = message.message;
                                messages.appendChild(p);

                                var p = document.createElement("p");
                                p.style.color = "gray"
                                p.innerHTML = "Posted by: " + message.writer + "<br><hr>";
                                messages.appendChild(p);
                            });
                        }
                    } else {
                        messages = document.getElementById(currentPanel + 'Messages')
                        messages.innerHTML = "No messages"
                    }
                }

            } else if (xhr.status == 500) {
                document.getElementById('postMessageForm').style.display = "none"
                messages = document.getElementById(currentPanel + 'Messages')
                messages.innerHTML = ""
                document.getElementById(currentPanel + 'Name').innerHTML = ""
                document.getElementById(currentPanel + 'Family').innerHTML = ""
                document.getElementById(currentPanel + 'Email').innerHTML = ""
                document.getElementById(currentPanel + 'City').innerHTML = ""
                document.getElementById(currentPanel + 'Gender').innerHTML = ""
                document.getElementById(currentPanel + 'Country').innerHTML = ""
                document.getElementById("browseInformation").style.display = "none"
                document.getElementById('noUserFoundError').innerHTML = "No user found with that email"
            } else {
                forceLogout()
            }

        }
    }
}

function forceLogout() {
    socket.close()
    localStorage.removeItem('currentUser');
    
    page('/login')

    currentPanel = 'home'
    browseUser = ''
}

// validating the form before login 
function logInValidation(form) {

    var email = form.loginemail.value
    var password = form.loginpassword.value
    if (password.length > 7) {

        let xhr = new XMLHttpRequest();
        const json = {
            email: email,
            password: password
        }
        xhr.open('POST', '/api/signin', true);
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xhr.send(JSON.stringify(json));

        xhr.onload = function (e) {
            if (xhr.status == 200) {
                
                localStorage.setItem("currentUser", JSON.stringify({
                    token: xhr.getResponseHeader("Authorization"),
                    email: email
                }));

                socket.open()
                socket.emit('login', {"data": xhr.getResponseHeader("Authorization")});
                page('/')
            } else {
                document.getElementById('login-error').innerHTML = "Wrong email or password"
            }
        }
    } else {
        document.getElementById('login-error').innerHTML = "Passwords too short"
    }
}

// validating the form before signup  
function signUpValidation(form) {
    var email = form.email.value
    var password = form.password.value
    var password2 = form.password2.value
    var firstname = form.firstname.value
    var familyname = form.familyname.value
    var city = form.city.value
    var country = form.country.value
    var gender = form.gender.value

    if (password.length > 7) {
        if (password == password2) {
            var user = {
                email: email,
                password: password,
                first_name: firstname,
                family_name: familyname,
                gender: gender,
                city: city,
                country: country
            }

            var xhr = new XMLHttpRequest();
            const json = user
            xhr.open('POST', '/api/signup', true);
            xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
            xhr.send(JSON.stringify(json));
            // if successful -> log in user
            xhr.onload = function (e) {
                if (xhr.status == 201) {
                    logInValidation({
                        loginemail: {
                            value: user.email
                        },
                        loginpassword: {
                            value: user.password
                        }
                    })
                } else {
                    document.getElementById('signup-error').innerHTML = "User already exists"
                }
            }
        } else {
            document.getElementById('signup-error').innerHTML = "Passwords doesn't match"
        }
    } else {
        document.getElementById('signup-error').innerHTML = "Password too short"
    }
}

function changePasswordValidation(form) {
    if (form.password.value.length > 7) {
        if (form.password.value == form.password2.value) {
            if (form.oldpassword.value != form.password.value) {
                var token = getLoggedInUserTokenEmail().token
                //var data = serverstub.changePassword(token, form.oldpassword.value, form.password.value)
                var xhr = new XMLHttpRequest();
                var json = {
                    old_password: form.oldpassword.value,
                    password: form.password.value
                }
                xhr.open('POST', '/api/updatepassword', true);
                xhr.setRequestHeader("Authorization", token)
                xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                xhr.send(JSON.stringify(json));

                xhr.onload = function (e) {
                    if (xhr.status == 201) {
                        document.getElementById("changePasswordMessage").innerHTML = "Successfully changed password"
                    } else {
                        document.getElementById("changePasswordMessage").innerHTML = "Something went wrong!"
                    }
                }
            } else {
                document.getElementById("changePasswordMessage").innerHTML = "New password the same as old password"
            }
        } else {
            document.getElementById("changePasswordMessage").innerHTML = "Repeated password does not match"
        }
    } else {
        document.getElementById("changePasswordMessage").innerHTML = "Password too short"
    }
}

// switching panel based on tab click
function switchTab(id) {
    // Hide all panels
    // HTLM collection -> array
    Array.from(document.getElementsByClassName('panel')).forEach(panel => {
        panel.classList.add('hidden-panel')
    })

    // get all tab links and make the fontweight normal
    Array.from(document.getElementsByClassName('tabLink')).forEach(panel => {
        panel.style.fontWeight = "normal"
    })

    currentPanel = id.split("-")[0] // string split: home-tab -> home

    // make selected tab text bold
    document.getElementById(currentPanel + "-tab").style.fontWeight = "bold"

    // un-hide the selected panel
    document.getElementById(id).classList.remove('hidden-panel')

    // Show clicked panel
    if (currentPanel == 'home') {
        displayUserWall(getLoggedInUserTokenEmail().email)
    } else {
        displayUserWall(browseUser)
    }
}

// getting token from local storage and logging the user out
function signOutValidation() {
    var token = getLoggedInUserTokenEmail().token

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/signout', true);
    xhr.setRequestHeader("Authorization", token)
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.send();

    xhr.onload = function (e) {
        if (xhr.status == 204) {
            socket.close()
            localStorage.removeItem('currentUser');
            page('/login')
            
            currentPanel = 'home'
            browseUser = ''
        } else {
            forceLogout()
        }
    }
}

function postMessage(form) {
    if (form.message.value.length > 0) {
        var token = getLoggedInUserTokenEmail().token

        var email = "";

        if (currentPanel == 'home') {
            email = getLoggedInUserTokenEmail().email
        } else {
            email = browseUser
        }

        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/post-message', true);
        xhr.setRequestHeader("Authorization", token)
        const json = {
            message: form.message.value,
            email: email
        }
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xhr.send(JSON.stringify(json));

        xhr.onload = function (e) {
            if (xhr.status == 201) {
                refreshPage()
            } else if(xhr.status == 500) {
                forceLogout()
            }
        }
    }
}

function refreshPage() {
    page()
}