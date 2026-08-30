package com.attendance.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton
import com.attendance.app.BuildConfig

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

@Singleton
class TokenStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        val KEY_TOKEN   = stringPreferencesKey("access_token")
        val KEY_ROLE    = stringPreferencesKey("role")
        val KEY_USER_ID = intPreferencesKey("user_id")
        val KEY_STUDENT_ID = intPreferencesKey("student_id")
        val KEY_INSTRUCTOR_ID = intPreferencesKey("instructor_id")
        val KEY_DOCTOR_ID = intPreferencesKey("doctor_id")
        val KEY_EMAIL   = stringPreferencesKey("email")
        val KEY_NAME    = stringPreferencesKey("name")
        val KEY_PROFILE_IMAGE = stringPreferencesKey("profile_image_url")
        val KEY_DEPT_IDS = stringPreferencesKey("assigned_dept_ids")
        val KEY_FAC_IDS  = stringPreferencesKey("assigned_fac_ids")
        val KEY_IS_DARK_MODE = booleanPreferencesKey("is_dark_mode")
        val KEY_SERVER_IP    = stringPreferencesKey("server_ip")
    }

    val token: Flow<String?> = context.dataStore.data.map { it[KEY_TOKEN] }
    val role: Flow<String?>  = context.dataStore.data.map { it[KEY_ROLE] }
    val userId: Flow<Int?>   = context.dataStore.data.map { it[KEY_USER_ID] }
    val studentId: Flow<Int?> = context.dataStore.data.map { it[KEY_STUDENT_ID] }
    val instructorId: Flow<Int?> = context.dataStore.data.map { it[KEY_INSTRUCTOR_ID] }
    val doctorId: Flow<Int?> = context.dataStore.data.map { it[KEY_DOCTOR_ID] }
    val email: Flow<String?> = context.dataStore.data.map { it[KEY_EMAIL] }
    val name: Flow<String?>  = context.dataStore.data.map { it[KEY_NAME] }
    val profileImageUrl: Flow<String?> = context.dataStore.data.map { it[KEY_PROFILE_IMAGE] }
    val assignedDepts: Flow<String?> = context.dataStore.data.map { it[KEY_DEPT_IDS] }
    val assignedFacs: Flow<String?> = context.dataStore.data.map { it[KEY_FAC_IDS] }
    val isDarkMode: Flow<Boolean> = context.dataStore.data.map { it[KEY_IS_DARK_MODE] ?: true } // Default to Dark
    private fun getDefaultIp(): String {
        return try {
            BuildConfig.BASE_URL
                .removePrefix("http://")
                .removePrefix("https://")
                .removeSuffix("/")
        } catch (e: Exception) {
            "10.0.2.2:8000"
        }
    }

    val serverIp: Flow<String> = context.dataStore.data.map { it[KEY_SERVER_IP] ?: getDefaultIp() }
    val baseUrl: Flow<String> = serverIp.map { 
        var rawIp = it.ifBlank { getDefaultIp() }.trim().removeSuffix("/")
        
        // Remove existing protocol to normalize
        val cleanIp = rawIp.removePrefix("http://").removePrefix("https://")
        
        // If no port is specified (no colon), append :8000
        val finalIp = if (!cleanIp.contains(":")) "$cleanIp:8000" else cleanIp
        
        "http://$finalIp/api"
    }


    suspend fun save(token: String, role: String, userId: Int, studentId: Int?, instructorId: Int?, doctorId: Int?, email: String, depts: List<Int>?, facs: List<Int>?, name: String?, profileImageUrl: String?) {
        context.dataStore.edit {
            it[KEY_TOKEN]   = token
            it[KEY_ROLE]    = role
            it[KEY_USER_ID] = userId
            if (studentId != null) it[KEY_STUDENT_ID] = studentId else it.remove(KEY_STUDENT_ID)
            if (instructorId != null) it[KEY_INSTRUCTOR_ID] = instructorId else it.remove(KEY_INSTRUCTOR_ID)
            if (doctorId != null) it[KEY_DOCTOR_ID] = doctorId else it.remove(KEY_DOCTOR_ID)
            it[KEY_EMAIL]   = email
            it[KEY_NAME]    = name ?: ""
            it[KEY_PROFILE_IMAGE] = profileImageUrl ?: ""
            it[KEY_DEPT_IDS] = depts?.joinToString(",") ?: ""
            it[KEY_FAC_IDS]  = facs?.joinToString(",") ?: ""
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }

    suspend fun setDarkMode(enabled: Boolean) {
        context.dataStore.edit { it[KEY_IS_DARK_MODE] = enabled }
    }


    suspend fun setServerIp(ip: String) {
        context.dataStore.edit { it[KEY_SERVER_IP] = ip }
    }

    fun bearerToken(raw: String) = "Bearer $raw"
}
