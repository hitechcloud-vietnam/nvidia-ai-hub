CREATE USER tooljet WITH PASSWORD 'change-me-tooljet-postgres';
CREATE DATABASE tooljet OWNER tooljet;
CREATE DATABASE tooljet_db OWNER tooljet;
GRANT ALL PRIVILEGES ON DATABASE tooljet TO tooljet;
GRANT ALL PRIVILEGES ON DATABASE tooljet_db TO tooljet;
