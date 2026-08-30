from app.core.security import verify_password

hash_value = '$argon2id$v=19$m=65536,t=3,p=4$/L/3nrO2FgIAICSE8F5rDQ$IzhBgg+NvFVp64iBGtdXpDo4bSDzgLW/lmQ1eRC0sLg'
print('matching Admin@1234:', verify_password('Admin@1234', hash_value))
print('matching admin@1234:', verify_password('admin@1234', hash_value))
print('matching Admin@12345:', verify_password('Admin@12345', hash_value))