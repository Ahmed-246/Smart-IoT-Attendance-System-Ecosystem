package com.attendance.app.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

// ─── Entity ───────────────────────────────────────────────────

@Entity(tableName = "attendance_cache")
data class AttendanceEntity(
    @PrimaryKey val id: Int,
    val studentId: Int,
    val sessionId: Int,
    val timestamp: String,
    val status: String,
    val courseName: String = ""
)

@Entity(tableName = "session_cache")
data class SessionEntity(
    @PrimaryKey val id: Int,
    val courseId: Int,
    val startTime: String,
    val endTime: String?,
    val isActive: Boolean
)

// ─── DAOs ─────────────────────────────────────────────────────

@Dao
interface AttendanceDao {
    @Query("SELECT * FROM attendance_cache WHERE studentId = :studentId ORDER BY timestamp DESC")
    fun getByStudent(studentId: Int): Flow<List<AttendanceEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(records: List<AttendanceEntity>)

    @Query("DELETE FROM attendance_cache")
    suspend fun clearAll()
}

@Dao
interface SessionDao {
    @Query("SELECT * FROM session_cache WHERE isActive = 1")
    fun getActive(): Flow<List<SessionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(sessions: List<SessionEntity>)

    @Query("DELETE FROM session_cache")
    suspend fun clearAll()
}

// ─── Database ─────────────────────────────────────────────────

@Database(
    entities = [AttendanceEntity::class, SessionEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AttendanceDatabase : RoomDatabase() {
    abstract fun attendanceDao(): AttendanceDao
    abstract fun sessionDao(): SessionDao
}
