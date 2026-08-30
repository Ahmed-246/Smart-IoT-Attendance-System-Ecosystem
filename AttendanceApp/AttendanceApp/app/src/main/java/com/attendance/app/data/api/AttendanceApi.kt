package com.attendance.app.data.api

import com.attendance.app.model.UserCreate
import com.attendance.app.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

data class MonitoringLogsResponse(
    val logs: List<LogEntry>,
    val total: Int
)

interface AttendanceApi {

    // ─── Auth ─────────────────────────────────────────────────
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<TokenResponse>

    @POST("auth/register/init")
    suspend fun registerInit(@Body request: Map<String, String>): Response<Map<String, String>>

    @POST("auth/register/verify")
    suspend fun registerVerify(@Body request: Map<String, String>): Response<Map<String, String>>

    @POST("auth/password/forgot")
    suspend fun passwordForgot(@Body request: PasswordResetRequest): Response<Map<String, String>>

    @POST("auth/password/reset")
    suspend fun passwordReset(@Body request: PasswordResetConfirm): Response<Map<String, String>>

    // ─── User Management ───────────────────────────────────────
    @GET("admin/users")
    suspend fun getUsers(
        @Header("Authorization") token: String
    ): Response<List<UserOut>>

    @POST("admin/users")
    suspend fun createUser(
        @Body body: UserCreate,
        @Header("Authorization") token: String
    ): Response<UserOut>

    @PUT("admin/users/{id}")
    suspend fun updateUser(
        @Path("id") id: Int,
        @Body body: UserUpdate,
        @Header("Authorization") token: String
    ): Response<UserOut>

    @DELETE("admin/users/{id}")
    suspend fun deleteUser(
        @Path("id") id: Int,
        @Header("Authorization") token: String
    ): Response<Unit>

    @Multipart
    @POST("auth/register/complete")
    suspend fun registerComplete(
        @Part("name") name: RequestBody,
        @Part("email") email: RequestBody,
        @Part("password") password: RequestBody,
        @Part("phone_number") phone: RequestBody,
        @Part("university_id") universityId: RequestBody,
        @Part("department_id") departmentId: RequestBody,
        @Part("academic_year") academicYear: RequestBody,
        @Part id_card: MultipartBody.Part
    ): Response<Map<String, String>>

    @Multipart
    @POST("auth/profile/image")
    suspend fun uploadProfileImage(
        @Part file: MultipartBody.Part,
        @Header("Authorization") token: String
    ): Response<Map<String, String>>

    @GET("attendance/student/{studentId}")
    suspend fun getStudentAttendance(
        @Path("studentId") studentId: Int,
        @Header("Authorization") token: String
    ): Response<List<AttendanceRecord>>

    @GET("attendance/session/{sessionId}")
    suspend fun getSessionAttendance(
        @Path("sessionId") sessionId: Int,
        @Header("Authorization") token: String
    ): Response<List<AttendanceRecord>>

    @POST("attendance/scan")
    suspend fun recordAttendance(
        @Body request: ScanRequest
    ): Response<ScanResponse>

    // ─── Sessions ─────────────────────────────────────────────
    @POST("sessions/")
    suspend fun createSession(
        @Body body: SessionCreate,
        @Header("Authorization") token: String
    ): Response<Session>

    @GET("sessions/active")
    suspend fun getActiveSessions(
        @Header("Authorization") token: String
    ): Response<List<Session>>

    @GET("sessions/all")
    suspend fun getAllSessions(
        @Header("Authorization") token: String
    ): Response<List<Session>>

    @GET("sessions/my")
    suspend fun getMySessions(
        @Header("Authorization") token: String
    ): Response<List<Session>>

    @GET("sessions/history")
    suspend fun getHistory(
        @Query("q") query: String?,
        @Header("Authorization") token: String
    ): Response<List<Session>>

    @PATCH("sessions/{sessionId}/close")
    suspend fun closeSession(
        @Path("sessionId") sessionId: Int,
        @Header("Authorization") token: String
    ): Response<Session>

    // ─── Global Scoped Entities ───────────────────────────────
    @GET("admin/students")
    suspend fun getStudents(
        @Header("Authorization") token: String
    ): Response<List<Student>>

    @GET("admin/students/{id}/profile")
    suspend fun getStudentProfile(
        @Path("id") id: Int,
        @Header("Authorization") token: String
    ): Response<StudentProfileOut>

    @GET("admin/doctors/{id}/profile")
    suspend fun getDoctorProfile(
        @Path("id") id: Int,
        @Header("Authorization") token: String
    ): Response<DoctorProfileOut>

    @GET("admin/instructors/{id}/profile")
    suspend fun getInstructorProfile(
        @Path("id") id: Int,
        @Header("Authorization") token: String
    ): Response<InstructorProfileOut>

    @GET("admin/courses")
    suspend fun getCourses(
        @Header("Authorization") token: String
    ): Response<List<Course>>

    @POST("admin/courses")
    suspend fun createCourse(
        @Body body: CourseCreate,
        @Header("Authorization") token: String
    ): Response<Course>

    @PUT("admin/courses/{id}")
    suspend fun updateCourse(
        @Path("id") id: Int,
        @Body body: CourseUpdate,
        @Header("Authorization") token: String
    ): Response<Course>

    @DELETE("admin/courses/{id}")
    suspend fun deleteCourse(
        @Path("id") id: Int,
        @Header("Authorization") token: String
    ): Response<Unit>

    @GET("admin/faculties")
    suspend fun getFaculties(
        @Header("Authorization") token: String
    ): Response<List<Faculty>>

    @GET("admin/departments")
    suspend fun getDepartments(
        @Header("Authorization") token: String
    ): Response<List<Department>>

    @POST("admin/faculties")
    suspend fun createFaculty(
        @Body body: FacultyCreate,
        @Header("Authorization") token: String
    ): Response<Faculty>

    @POST("admin/departments")
    suspend fun createDepartment(
        @Body body: DepartmentCreate,
        @Header("Authorization") token: String
    ): Response<Department>

    @GET("admin/reports/session/{sessionId}")
    suspend fun getSessionReport(
        @Path("sessionId") sessionId: Int,
        @Header("Authorization") token: String
    ): Response<AttendanceReport>

    // ─── Assessments & Gradebook ──────────────────────────────
    @GET("assessments/")
    suspend fun getAssessments(
        @Query("course_id") courseId: Int?,
        @Query("status") status: String?,
        @Header("Authorization") token: String
    ): Response<List<Assessment>>

    @POST("assessments/")
    suspend fun createAssessment(
        @Body body: AssessmentCreate,
        @Header("Authorization") token: String
    ): Response<Assessment>

    @GET("gradebook/{assessmentId}")
    suspend fun getGradebook(
        @Path("assessmentId") assessmentId: Int,
        @Header("Authorization") token: String
    ): Response<List<GradeResult>>

    @PATCH("gradebook/{assessmentId}/commit")
    suspend fun commitGrades(
        @Path("assessmentId") assessmentId: Int,
        @Body body: GradeBulkCommit,
        @Header("Authorization") token: String
    ): Response<Map<String, Any>>

    // ─── AI ───────────────────────────────────────────────────
    @POST("ai/query")
    suspend fun aiQuery(
        @Body query: AIQuery,
        @Header("Authorization") token: String
    ): Response<AIResponse>

    // ─── Dashboards ───────────────────────────────────────────
    @GET("admin/dashboard/global")
    suspend fun getGlobalStats(
        @Header("Authorization") token: String
    ): Response<GlobalStats>

    @GET("admin/dashboard/activity")
    suspend fun getActivityFeed(
        @Header("Authorization") token: String
    ): Response<List<ActivityFeedItem>>

    @GET("gradebook-dashboard/report")
    suspend fun getGradeReport(
        @Query("student_id") studentId: Int,
        @Header("Authorization") token: String
    ): Response<GradeReportResponse>

    // ─── Approvals ────────────────────────────────────────────
    @GET("admin/students/pending")
    suspend fun getPendingStudents(
        @Header("Authorization") token: String
    ): Response<List<Student>>

    @POST("admin/students/{id}/approve")
    suspend fun approveStudent(
        @Path("id") id: Int,
        @Body payload: Map<String, String>, // {"status": "APPROVED"}
        @Header("Authorization") token: String
    ): Response<Student>

    @DELETE("admin/students/{id}/reject")
    suspend fun rejectStudent(
        @Path("id") id: Int,
        @Header("Authorization") token: String
    ): Response<Unit>

    @PUT("admin/students/{id}")
    suspend fun updateStudent(
        @Path("id") id: Int,
        @Body payload: Map<String, Any?>,
        @Header("Authorization") token: String
    ): Response<Student>

    @GET("admin/students/history")
    suspend fun getRegistrationHistory(
        @Query("status") status: String,
        @Header("Authorization") token: String
    ): Response<List<Student>>

    // ─── Pre-Verified List (Onboarding Hub) ──────────────────────────
    @GET("admin/pre-verified")
    suspend fun getPreVerified(
        @Header("Authorization") token: String
    ): Response<List<PreVerifiedStudentOut>>

    @POST("admin/pre-verified")
    suspend fun createPreVerified(
        @Body body: PreVerifiedStudentCreate,
        @Header("Authorization") token: String
    ): Response<PreVerifiedStudentOut>

    @DELETE("admin/pre-verified/{id}")
    suspend fun deletePreVerified(
        @Path("id") id: Int,
        @Header("Authorization") token: String
    ): Response<Unit>

    @GET("admin/pre-verified/history")
    suspend fun getPreVerifiedHistory(
        @Header("Authorization") token: String
    ): Response<Map<String, Any>> // {"history": [], "unseen_count": 0}

    @POST("admin/pre-verified/history/mark-seen")
    suspend fun markPreVerifiedHistorySeen(
        @Header("Authorization") token: String
    ): Response<Map<String, String>>

    // ─── IoT Workshop ─────────────────────────────────────────
    @POST("attendance/discovery/start")
    suspend fun startDiscovery(
        @Header("Authorization") token: String
    ): Response<Map<String, String>>

    @GET("attendance/discovery/check")
    suspend fun checkDiscovery(
        @Query("token") discoveryToken: String,
        @Header("Authorization") authHeader: String
    ): Response<DiscoveryResult>

    // ─── Super Admin Configuration ──────────────────────────────
    @GET("admin/term/config")
    suspend fun getTermConfig(
        @Header("Authorization") token: String
    ): Response<TermConfig>

    @PATCH("admin/term/config")
    suspend fun updateTermConfig(
        @Body config: Map<String, Double>,
        @Header("Authorization") token: String
    ): Response<TermConfig>

    @Multipart
    @POST("admin/term/logo")
    suspend fun uploadSystemLogo(
        @Part logo: MultipartBody.Part,
        @Header("Authorization") token: String
    ): Response<Map<String, String>>

    // ─── Monitoring ─────────────────────────────────────────────
    @GET("monitoring/summary")
    suspend fun getMonitoringSummary(
        @Header("Authorization") token: String
    ): Response<MonitoringSummary>

    @GET("monitoring/logs")
    suspend fun getMonitoringLogs(
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0,
        @Header("Authorization") token: String
    ): Response<MonitoringLogsResponse>
}
