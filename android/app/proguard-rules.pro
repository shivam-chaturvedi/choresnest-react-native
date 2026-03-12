# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**
-keep class com.facebook.jni.** { *; }

# Firebase Crashlytics needs file/line info kept so stack traces stay readable when mapping files are uploaded.
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# OkHttp
-dontwarn okhttp3.**

# Sentry
-keep class io.sentry.** { *; }

# Supabase / Retrofit / Gson safe rules
-keepattributes Signature
-keepattributes *Annotation*
-keep class io.supabase.** { *; }

# WatermelonDB's Android native layer relies on reflection, so keep its packages intact.
-keep class com.nozbe.watermelondb.** { *; }

# Keep models
-keep class com.choresnest.** { *; }

# React Native gesture handler
-keep class com.swmansion.gesturehandler.** { *; }

# React Navigation / reanimated
-keep class com.swmansion.reanimated.** { *; }

# Notifee ships its own ProGuard rules because it uses reflection, worker APIs, and JWT/BouncyCastle utilities.
-printmapping javasource.map
-renamesourcefileattribute SourceFile
-keepattributes Exceptions,InnerClasses,Signature,Deprecated,SourceFile,LineNumberTable,EnclosingMethod
-keepattributes *Annotation*
-keep @interface androidx.annotation.Keep
-keep @androidx.annotation.Keep class *
-keepclasseswithmembers class * {
  @androidx.annotation.Keep <fields>;
}
-keepclasseswithmembers class * {
  @androidx.annotation.Keep <methods>;
}
-keep @interface app.notifee.core.KeepForSdk
-keep @app.notifee.core.KeepForSdk class *
-keepclasseswithmembers class * {
  @app.notifee.core.KeepForSdk <fields>;
}
-keepclasseswithmembers class * {
  @app.notifee.core.KeepForSdk <methods>;
}
-keepclassmembernames class * {
    java.lang.Class class$(java.lang.String);
    java.lang.Class class$(java.lang.String, boolean);
}
-keepclasseswithmembernames class * {
    native <methods>;
}
-keepclassmembers class * extends java.lang.Enum {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
-keepclassmembers class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context,androidx.work.WorkerParameters);
}
-keep class io.jsonwebtoken.** { *; }
-keepnames class io.jsonwebtoken.* { *; }
-keepnames interface io.jsonwebtoken.* { *; }
-keep class org.bouncycastle.** { *; }
-keepnames class org.bouncycastle.** { *; }
-dontwarn org.bouncycastle.**
-keepclassmembers class * {
    @org.greenrobot.eventbus.Subscribe <methods>;
}
-keep enum org.greenrobot.eventbus.ThreadMode { *; }
-keepclassmembers class * extends org.greenrobot.eventbus.util.ThrowableFailureEvent {
    <init>(java.lang.Throwable);
}
-dontwarn okio.**
-dontwarn okhttp3.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase
-repackageclasses 'n.o.t.i.f.e.e'

# PDFBox support (used for vault documents)
-keep class com.tom_roush.pdfbox.** { *; }
-dontwarn com.gemalto.jp2.**
