create table users(
    email varchar(50), 
    password varchar(50), 
    first_name varchar(50), 
    family_name varchar(50), 
    city varchar(50), 
    country varchar(50), 
    gender varchar(50), 
    primary key(email)
)
/
create table messages(
    email varchar(50),
    writer varchar(50),
    message text
)