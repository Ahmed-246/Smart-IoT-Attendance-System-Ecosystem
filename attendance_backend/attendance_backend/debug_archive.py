import asyncio
from app.db.database import AsyncSessionLocal
from app.models.enrollment import Enrollment
from app.models.academic_record import AcademicRecord
from sqlalchemy import select, func

async def main():
    async with AsyncSessionLocal() as db:
        # Check archived enrollments
        archived = await db.execute(
            select(func.count(Enrollment.id)).where(Enrollment.is_current == False)
        )
        archived_count = archived.scalar()
        print(f"Total archived enrollments (is_current=False): {archived_count}")

        # Check all enrollment statuses
        all_enroll = await db.execute(select(Enrollment.is_current, func.count(Enrollment.id)).group_by(Enrollment.is_current))
        for row in all_enroll.all():
            print(f"  is_current={row[0]}: {row[1]} enrollments")

        # Check academic records
        recs = await db.execute(select(func.count(AcademicRecord.id)))
        rec_count = recs.scalar()
        print(f"\nTotal AcademicRecord entries: {rec_count}")

        if rec_count > 0:
            years = await db.execute(
                select(AcademicRecord.academic_year, AcademicRecord.semester, func.count(AcademicRecord.id))
                .group_by(AcademicRecord.academic_year, AcademicRecord.semester)
            )
            for row in years.all():
                print(f"  Year {row[0]}, Sem {row[1]}: {row[2]} records")

        # Check student 41 specifically
        print("\n--- Student 41 ---")
        s41_recs = await db.execute(
            select(AcademicRecord).where(AcademicRecord.student_id == 41)
        )
        for r in s41_recs.scalars().all():
            print(f"  AcademicRecord: year={r.academic_year}, sem={r.semester}, status={r.result_type or r.status_at_time}, avg={r.weighted_average}")

        s41_enroll = await db.execute(
            select(Enrollment).where(Enrollment.student_id == 41)
        )
        for e in s41_enroll.scalars().all():
            print(f"  Enrollment: id={e.id}, is_current={e.is_current}, year_snap={e.academic_year_snapshot}, sem_snap={getattr(e, 'semester_snapshot', 'N/A')}")

if __name__ == "__main__":
    asyncio.run(main())
