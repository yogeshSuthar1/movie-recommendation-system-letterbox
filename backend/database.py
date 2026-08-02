
from sqlalchemy import create_engine

from backend.config import *



engine = create_engine(
    
    f"mysql+mysqlconnector://{USER}:{PASSWORD}@{HOST}/{DATABASE}",

    pool_pre_ping=True

)