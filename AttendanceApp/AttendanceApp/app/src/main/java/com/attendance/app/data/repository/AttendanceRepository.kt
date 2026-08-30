package com.attendance.app.data.repository

import com.attendance.app.data.TokenStore
import com.attendance.app.data.api.AttendanceApi
import com.attendance.app.data.db.*
import com.attendance.app.model.*
import okhttp3.MultipartBody
import kotlinx.coroutines.flow.firstOrNull
import javax.inject.Inject
import javax.inject.Singleton

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

@Singleton
class AttendanceRepository @Inject constructor(
    private val api: AttendanceApi,
    private val tokenStore: TokenStore,
    private val attendanceDao: AttendanceDao,
    private val sessionDao: SessionDao
) {
    // ─── Auth ──────────────────────────────────────────────────
    fun tokenFlow() = tokenStore.token
    fun getRoleFlow() = tokenStore.role
    fun getEmailFlow() = tokenStore.email
    fun getNameFlow() = tokenStore.name
    fun getProfileImageUrlFlow() = tokenStore.profileImageUrl
    fun getUserIdFlow() = tokenStore.userId
    fun getStudentIdFlow() = tokenStore.studentId
    fun getInstructorIdFlow() = tokenStore.instructorId
    fun getDoctorIdFlow() = tokenStore.doctorId
    fun getAssignedDeptsFlow() = tokenStore.assignedDepts
    fun getBaseUrlFlow() = tokenStore.baseUrl

    suspend fun registerInit(email: String): Result<Map<String, String>> {
        return try {
            val resp = api.registerInit(mapOf("email" to email))
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyMap())
            else Result.Error("Failed to initiate registration")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun registerVerify(email: String, token: String): Result<Map<String, String>> {
        return try {
            val resp = api.registerVerify(mapOf("target" to email, "token" to token))
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyMap())
            else Result.Error("Invalid or expired token")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun registerComplete(
        name: okhttp3.RequestBody,
        email: okhttp3.RequestBody,
        password: okhttp3.RequestBody,
        phone: okhttp3.RequestBody,
        universityId: okhttp3.RequestBody,
        departmentId: okhttp3.RequestBody,
        academicYear: okhttp3.RequestBody,
        idCard: okhttp3.MultipartBody.Part
    ): Result<Map<String, String>> {
        return try {
            val resp = api.registerComplete(
                name, email, password, phone, universityId, departmentId, academicYear, idCard
            )
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyMap())
            else Result.Error("Registration failed: ${resp.message()}")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun uploadProfileImage(file: okhttp3.MultipartBody.Part): Result<Map<String, String>> {
        return try {
            val resp = api.uploadProfileImage(file, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyMap())
            else Result.Error("Upload failed: ${resp.message()}")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun login(email: String, password: String): Result<TokenResponse> {
        return try {
            val resp = api.login(LoginRequest(email, password))
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) {
                    tokenStore.save(
                        body.accessToken, 
                        body.role, 
                        body.userId,
                        body.studentId,
                        body.instructorId,
                        body.doctorId,
                        email, 
                        body.assignedDepartments, 
                        body.assignedFaculties,
                        body.name,
                        body.profileImageUrl
                    )
                    Result.Success(body)
                } else {
                    Result.Error("Invalid response from server")
                }
            } else {
                Result.Error("Invalid email or password")
            }
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun passwordForgot(phoneNumber: String): Result<Map<String, String>> {
        return try {
            val resp = api.passwordForgot(PasswordResetRequest(phoneNumber))
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyMap())
            else Result.Error("Phone number not found")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun passwordReset(phoneNumber: String, token: String, newPassword: String): Result<Map<String, String>> {
        return try {
            val resp = api.passwordReset(PasswordResetConfirm(phoneNumber, token, newPassword))
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyMap())
            else Result.Error("Invalid token or reset failed")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun logout() = tokenStore.clear()

    // ─── User Management ───────────────────────────────────────
    suspend fun getUsers(): Result<List<UserOut>> {
        return try {
            val resp = api.getUsers(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to load users")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun createUser(req: UserCreate): Result<UserOut> {
        return try {
            val resp = api.createUser(req, bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("Empty user response")
            } else Result.Error("Failed to create user")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun updateUser(id: Int, req: UserUpdate): Result<UserOut> {
        return try {
            val resp = api.updateUser(id, req, bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("Empty update response")
            } else Result.Error("Failed to update user")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun deleteUser(id: Int): Result<Unit> {
        return try {
            val resp = api.deleteUser(id, bearer())
            if (resp.isSuccessful) Result.Success(Unit)
            else Result.Error("Failed to delete user")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    private suspend fun bearer(): String {
        val t = tokenStore.token.firstOrNull() ?: ""
        return "Bearer $t"
    }

    // ─── Attendance ────────────────────────────────────────────
    suspend fun getStudentAttendance(studentId: Int): Result<List<AttendanceRecord>> {
        return try {
            val resp = api.getStudentAttendance(studentId, bearer())
            if (resp.isSuccessful) {
                val records = resp.body() ?: emptyList()
                // Cache locally
                attendanceDao.insertAll(records.map {
                    AttendanceEntity(
                        id = it.id,
                        studentId = it.studentId,
                        sessionId = it.sessionId,
                        timestamp = it.timestamp,
                        status = it.status
                    )
                })
                Result.Success(records)
            } else Result.Error("Failed to load attendance")
        } catch (e: Exception) {
            Result.Error("Offline — showing cached data")
        }
    }

    fun getCachedAttendance(studentId: Int) = attendanceDao.getByStudent(studentId)

    // ─── Sessions ──────────────────────────────────────────────
    suspend fun getMySessions(): Result<List<Session>> {
        return try {
            val resp = api.getMySessions(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to load your sessions")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getActiveSessions(): Result<List<Session>> {
        return try {
            val resp = api.getActiveSessions(bearer())
            if (resp.isSuccessful) {
                val sessions = resp.body() ?: emptyList()
                sessionDao.insertAll(sessions.map {
                    SessionEntity(it.id, it.courseId, it.startTime, it.endTime, it.isActive)
                })
                Result.Success(sessions)
            } else Result.Error("Failed to load sessions")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun createSession(courseId: Int): Result<Session> {
        return try {
            val resp = api.createSession(SessionCreate(courseId), bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body) 
                else Result.Error("Server returned empty body")
            } else Result.Error("Could not create session — one may already be active")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun closeSession(sessionId: Int): Result<Session> {
        return try {
            val resp = api.closeSession(sessionId, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: throw Exception("Empty body"))
            else Result.Error("Failed to close session")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getAllSessions(): Result<List<Session>> {
        return try {
            val resp = api.getAllSessions(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to load all sessions")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getSessionHistory(query: String? = null): Result<List<Session>> {
        return try {
            val resp = api.getHistory(query, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to load session history")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    // ─── Students / Courses ────────────────────────────────────
    suspend fun getStudents(): Result<List<Student>> {
        return try {
            val resp = api.getStudents(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to load students")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getStudentProfile(id: Int): Result<StudentProfileOut> {
        return try {
            val resp = api.getStudentProfile(id, bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("Empty profile response")
            } else Result.Error("Failed to load student profile")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getDoctorProfile(id: Int): Result<DoctorProfileOut> {
        return try {
            val resp = api.getDoctorProfile(id, bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("Empty doctor profile response")
            } else Result.Error("Failed to load doctor profile: ${resp.message()}")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getInstructorProfile(id: Int): Result<InstructorProfileOut> {
        return try {
            val resp = api.getInstructorProfile(id, bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("Empty instructor profile response")
            } else Result.Error("Failed to load instructor profile: ${resp.message()}")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getCourses(): Result<List<Course>> {
        return try {
            val resp = api.getCourses(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to load courses")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun createCourse(req: CourseCreate): Result<Course> {
        return try {
            val resp = api.createCourse(req, bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("Empty course response")
            } else Result.Error("Failed to create course")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun updateCourse(id: Int, req: CourseUpdate): Result<Course> {
        return try {
            val resp = api.updateCourse(id, req, bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("Empty course update response")
            } else Result.Error("Failed to update course")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun deleteCourse(id: Int): Result<Unit> {
        return try {
            val resp = api.deleteCourse(id, bearer())
            if (resp.isSuccessful) Result.Success(Unit)
            else Result.Error("Failed to delete course")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getFaculties(): Result<List<Faculty>> {
        return try {
            val resp = api.getFaculties(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to load faculties")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getDepartments(): Result<List<Department>> {
        return try {
            val resp = api.getDepartments(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to load departments")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun createFaculty(name: String, description: String? = null): Result<Faculty> {
        return try {
            val resp = api.createFaculty(FacultyCreate(name, description), bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: throw Exception("Empty body"))
            else Result.Error("Failed to create faculty")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun createDepartment(name: String, facultyId: Int, description: String? = null): Result<Department> {
        return try {
            val resp = api.createDepartment(DepartmentCreate(name, description, facultyId), bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: throw Exception("Empty body"))
            else Result.Error("Failed to create department")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getSessionReport(sessionId: Int): Result<AttendanceReport> {
        return try {
            val resp = api.getSessionReport(sessionId, bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("Empty report body")
            }
            else Result.Error("Failed to load report")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    // ─── Assessments & Gradebook ───────────────────────────────
    suspend fun getAssessments(courseId: Int? = null, status: String? = null): Result<List<Assessment>> {
        return try {
            val resp = api.getAssessments(courseId, status, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to load assessments")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun createAssessment(courseId: Int, title: String, type: String, maxScore: Double, instructorId: Int? = null): Result<Assessment> {
        return try {
            val req = AssessmentCreate(courseCode = courseId, title = title, assessmentType = type, maxScore = maxScore, instructorId = instructorId)
            val resp = api.createAssessment(req, bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("Assessment creation failed (empty body)")
            }
            else Result.Error("Failed to create assessment")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getGradebook(assessmentId: Int): Result<List<GradeResult>> {
        return try {
            val resp = api.getGradebook(assessmentId, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to load gradebook")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun commitGrades(assessmentId: Int, updateRequest: GradeBulkCommit): Result<Map<String, Any>> {
        return try {
            val resp = api.commitGrades(assessmentId, updateRequest, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyMap())
            else Result.Error("Failed to commit grades")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    // ─── AI ────────────────────────────────────────────────────
    suspend fun askAI(question: String, messageCount: Int = 0): Result<AIResponse> {
        return try {
            val resp = api.aiQuery(AIQuery(question, messageCount), bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("AI returned no answer")
            }
            else Result.Error("AI service unavailable")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    // ─── Dashboards ────────────────────────────────────────────
    suspend fun getGlobalStats(): Result<GlobalStats> {
        return try {
            val resp = api.getGlobalStats(bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("No stats available")
            }
            else Result.Error("Failed to load global stats")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getActivityFeed(): Result<List<ActivityFeedItem>> {
        return try {
            val resp = api.getActivityFeed(bearer())
            if (resp.isSuccessful) Result.Success(resp.body()!!)
            else Result.Error("Failed to load activity feed")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    // ─── Approvals ────────────────────────────────────────────
    suspend fun getPendingStudents(): Result<List<Student>> {
        return try {
            val resp = api.getPendingStudents(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to fetch pending students")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun approveStudent(id: Int): Result<Student> {
        return try {
            val resp = api.approveStudent(id, mapOf("status" to "APPROVED"), bearer())
            if (resp.isSuccessful) {
                val body = resp.body()
                if (body != null) Result.Success(body)
                else Result.Error("Approval succeeded but no data returned")
            }
            else Result.Error("Approval failed")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun rejectStudent(id: Int): Result<Unit> {
        return try {
            val resp = api.rejectStudent(id, bearer())
            if (resp.isSuccessful) Result.Success(Unit)
            else Result.Error("Rejection failed")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getRegistrationHistory(status: String): Result<List<Student>> {
        return try {
            val resp = api.getRegistrationHistory(status, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to fetch registration history")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    // ─── Pre-Verified (Onboarding Hub) ──────────────────────────
    suspend fun getPreVerified(): Result<List<PreVerifiedStudentOut>> {
        return try {
            val resp = api.getPreVerified(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyList())
            else Result.Error("Failed to fetch allowlist")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun createPreVerified(req: PreVerifiedStudentCreate): Result<PreVerifiedStudentOut> {
        return try {
            val resp = api.createPreVerified(req, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: throw Exception("Empty body"))
            else Result.Error("Failed to add to allowlist")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun deletePreVerified(id: Int): Result<Unit> {
        return try {
            val resp = api.deletePreVerified(id, bearer())
            if (resp.isSuccessful) Result.Success(Unit)
            else Result.Error("Failed to remove from allowlist")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getPreVerifiedHistory(): Result<Map<String, Any>> {
        return try {
            val resp = api.getPreVerifiedHistory(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyMap())
            else Result.Error("Failed to fetch auto-approve history")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun markPreVerifiedHistorySeen(): Result<Unit> {
        return try {
            api.markPreVerifiedHistorySeen(bearer())
            Result.Success(Unit)
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getGradeReport(studentId: Int): Result<GradeReportResponse> {
        return try {
            val resp = api.getGradeReport(studentId, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: throw Exception("Empty grade report"))
            else Result.Error("Failed to fetch grade report")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    // ─── IoT Discovery ────────────────────────────────────────
    suspend fun startDiscovery(): Result<Map<String, String>> {
        return try {
            val resp = api.startDiscovery(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: emptyMap())
            else Result.Error("Could not start discovery")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun checkDiscovery(discoveryToken: String): Result<DiscoveryResult> {
        return try {
            val resp = api.checkDiscovery(discoveryToken, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: throw Exception("Empty discovery status"))
            else Result.Error("Discovery check failed")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun updateStudent(id: Int, updates: Map<String, Any?>): Result<Student> {
        return try {
            val resp = api.updateStudent(id, updates, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: throw Exception("Update successful but no data returned"))
            else Result.Error("Failed to update student")
        } catch (e: Exception) {
            handleError(e)
        }
    }


    // ─── Branding (Super Admin) ─────────────────────────────────
    suspend fun getTermConfig(): Result<TermConfig> {
        return try {
            val resp = api.getTermConfig(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: throw Exception("Empty config"))
            else Result.Error("Failed to fetch configuration")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun updateTermConfig(weights: Map<String, Double>): Result<TermConfig> {
        return try {
            val resp = api.updateTermConfig(weights, bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: throw Exception("Update successful but no data"))
            else Result.Error("Failed to update weights")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun uploadSystemLogo(logo: MultipartBody.Part): Result<String> {
        return try {
            val resp = api.uploadSystemLogo(logo, bearer())
            if (resp.isSuccessful) Result.Success(resp.body()?.get("url") ?: "Success")
            else Result.Error("Failed to upload logo")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    // ─── Monitoring ─────────────────────────────────────────────
    suspend fun getMonitoringSummary(): Result<MonitoringSummary> {
        return try {
            val resp = api.getMonitoringSummary(bearer())
            if (resp.isSuccessful) Result.Success(resp.body() ?: throw Exception("Empty summary"))
            else Result.Error("Failed to fetch monitoring summary")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    suspend fun getMonitoringLogs(limit: Int = 50, offset: Int = 0): Result<List<LogEntry>> {
        return try {
            val resp = api.getMonitoringLogs(limit, offset, bearer())
            if (resp.isSuccessful) {
                Result.Success(resp.body()?.logs ?: emptyList())
            } else Result.Error("Failed to fetch monitoring logs")
        } catch (e: Exception) {
            handleError(e)
        }
    }

    private fun handleError(e: Exception): Result.Error {
        return when (e) {
            is java.net.ConnectException -> Result.Error("Connection refused. Is the PM2 backend running on your laptop?")
            is java.net.SocketTimeoutException -> Result.Error("Connection timed out. Check your laptop's IP address.")
            is java.net.UnknownHostException -> Result.Error("Server not found. Verify the IP in App Settings.")
            else -> Result.Error("Network error: ${e.localizedMessage}")
        }
    }
}
