# File Path: backend/extensions.py
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

mail = Mail()

# 🚀 P0 FIX #3: Global Rate Limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute"],
    storage_uri="memory://"
)