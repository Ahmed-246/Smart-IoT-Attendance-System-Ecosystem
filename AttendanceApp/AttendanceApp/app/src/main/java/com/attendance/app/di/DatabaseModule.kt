package com.attendance.app.di

import android.content.Context
import androidx.room.Room
import com.attendance.app.data.db.AttendanceDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext ctx: Context): AttendanceDatabase =
        Room.databaseBuilder(ctx, AttendanceDatabase::class.java, "attendance.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun provideAttendanceDao(db: AttendanceDatabase) = db.attendanceDao()
    @Provides fun provideSessionDao(db: AttendanceDatabase) = db.sessionDao()
}
