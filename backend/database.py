import os
import ssl
import importlib.util
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from backend.config import HOST, PORT, USER, PASSWORD, DATABASE

driver = "mysql+pymysql" if importlib.util.find_spec("pymysql") else "mysql+mysqlconnector"

db_url = URL.create(
    drivername=driver,
    username=USER,
    password=PASSWORD,
    host=HOST,
    port=PORT,
    database=DATABASE,
)

connect_args = {}
if os.getenv("DB_SSL", "false").lower() == "true":
    if driver == "mysql+pymysql":
        connect_args["ssl"] = {"check_hostname": False}
    else:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_ctx

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=280,
)