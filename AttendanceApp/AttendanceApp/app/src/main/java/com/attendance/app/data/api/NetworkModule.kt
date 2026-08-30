package com.attendance.app.data.api

import com.attendance.app.BuildConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(tokenStore: com.attendance.app.data.TokenStore): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG)
                HttpLoggingInterceptor.Level.BODY
            else
                HttpLoggingInterceptor.Level.NONE
        }

        val authInterceptor = Interceptor { chain ->
            val requestBuilder = chain.request().newBuilder()
            val token: String? = runBlocking {
                tokenStore.token.first()
            }
            if (token != null && token.isNotEmpty()) {
                requestBuilder.addHeader("Authorization", "Bearer $token")
            }
            chain.proceed(requestBuilder.build())
        }

        val dynamicUrlInterceptor = okhttp3.Interceptor { chain ->
            var request = chain.request()
            val baseUrlString = runBlocking {
                tokenStore.baseUrl.first()
            }
            
            val newBaseUrl = baseUrlString.toHttpUrlOrNull()
            val newUrl = if (newBaseUrl != null) {
                val oldPathSegments = request.url.pathSegments
                val newUrlBuilder = request.url.newBuilder()
                    .scheme(newBaseUrl.scheme)
                    .host(newBaseUrl.host)
                    .port(newBaseUrl.port)
                
                // Clear old path and prepend new base path segments + old ones
                newUrlBuilder.removePathSegment(0) 
                // Since we start from http://localhost/, we need to be careful
                // A better way is to rebuild from newBaseUrl
                
                val finalUrlBuilder = newBaseUrl.newBuilder()
                for (segment in request.url.pathSegments) {
                    finalUrlBuilder.addPathSegment(segment)
                }
                // Copy query parameters
                request.url.queryParameterNames.forEach { name ->
                    request.url.queryParameter(name)?.let { value ->
                        finalUrlBuilder.addQueryParameter(name, value)
                    }
                }
                finalUrlBuilder.build()
            } else {
                request.url
            }
                
            request = request.newBuilder()
                .url(newUrl)
                .build()
            chain.proceed(request)
        }

        val unauthorizedInterceptor = Interceptor { chain ->
            val response = chain.proceed(chain.request())
            if (response.code == 401) {
                runBlocking {
                    tokenStore.clear()
                }
            }
            response
        }

        return OkHttpClient.Builder()
            .addInterceptor(logging)
            .addInterceptor(authInterceptor)
            .addInterceptor(dynamicUrlInterceptor)
            .addInterceptor(unauthorizedInterceptor)
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .baseUrl("http://localhost/") // Placeholder, replaced by interceptor
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

    @Provides
    @Singleton
    fun provideApi(retrofit: Retrofit): AttendanceApi =
        retrofit.create(AttendanceApi::class.java)
}
