UPDATE users 
SET username = 'owner', 
    password_hash = '', 
    account_type = 'STAFF',
    status = 'ACTIVE'
WHERE email = 'hoodazoz2030@gmail.com';

UPDATE organization_members 
SET role = 'SUPER_ADMIN'
WHERE user_id = (SELECT id FROM users WHERE email = 'hoodazoz2030@gmail.com');