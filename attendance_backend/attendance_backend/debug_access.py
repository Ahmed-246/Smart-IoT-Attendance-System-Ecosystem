
import asyncio
from app.db.database import SessionLocal
from app.models.student import Student
from app.models.user import User
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        res = await db.execute(select(Student).where(Student.id == 26))
        student = res.scalar_one_or_none()
        if student:
            print(f"STUDENT_FOUND: ID=26, Email={student.email}")
            user_res = await db.execute(select(User).where(User.email == student.email))
            user = user_res.scalar_one_or_none()
            if user:
                print(f"USER_FOUND: Email={user.email}, Role={user.role}")
            else:
                print(f"USER_NOT_FOUND for email {student.email}")
        else:
            print("STUDENT_NOT_FOUND for ID 26")

if __name__ == "__main__":
    asyncio.run(main())
