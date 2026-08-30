import re
import os

file_path = r'c:\Users\shadlence\Desktop\Calude Project\Smart IoT Attendance System\attendance-dashboard\attendance-dashboard\src\pages\StudentsPage.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace Phone Number inputs
phone_pattern = r'(<Field label="Phone Number \(Egypt\)">\s*)<Input value={form\.phone_number} onChange={e => setForm\(f => \({ \.\.\.f, phone_number: e\.target\.value }\)\)} placeholder="01X YYYY ZZZZ" />'
phone_replacement = r'\1<Input type="tel" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value.replace(/\\D/g, "") }))} placeholder="01XXXXXXXXX" maxLength={11} />'

content = re.sub(phone_pattern, phone_replacement, content)

# 2. Replace Emergency Phone inputs
emergency_pattern = r'(<Field label="Emergency Phone">\s*)<Input value={form\.emergency_contact_phone} onChange={e => setForm\(f => \({ \.\.\.f, emergency_contact_phone: e\.target\.value }\)\)} placeholder="01X YYYY ZZZZ" />'
emergency_replacement = r'\1<Input type="tel" value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value.replace(/\\D/g, "") }))} placeholder="01XXXXXXXXX" maxLength={11} />'

content = re.sub(emergency_pattern, emergency_replacement, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully replaced phone validation logic in StudentsPage.js")
