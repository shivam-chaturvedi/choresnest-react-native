package com.choresnest

import android.app.Application
import android.content.Context
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import androidx.lifecycle.OnLifecycleEvent
import androidx.lifecycle.ProcessLifecycleOwner
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost

class MainApplication : Application(), ReactApplication, LifecycleObserver {

  private val preferences by lazy {
    getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  private var hasBeenBackgrounded = false
  var isAppInBackground = false
    private set

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              add(BiometricLifecyclePackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    ProcessLifecycleOwner.get().lifecycle.addObserver(this)
    loadReactNative(this)
  }

  @OnLifecycleEvent(Lifecycle.Event.ON_START)
  fun onEnterForeground() {
    isAppInBackground = false
    if (hasBeenBackgrounded) {
      markAppAsAlive()
    }
    hasBeenBackgrounded = false
  }

  @OnLifecycleEvent(Lifecycle.Event.ON_STOP)
  fun onEnterBackground() {
    isAppInBackground = true
    hasBeenBackgrounded = true
  }

  override fun onTrimMemory(level: Int) {
    super.onTrimMemory(level)
    if (level == TRIM_MEMORY_UI_HIDDEN) {
      hasBeenBackgrounded = true
      markAppAsKilled()
    }
  }

  fun shouldShowBiometric(): Boolean {
    return preferences.getBoolean(KEY_APP_WAS_KILLED, true)
  }

  fun markBiometricShown() {
    markAppAsAlive()
  }

  private fun markAppAsAlive() {
    preferences.edit().putBoolean(KEY_APP_WAS_KILLED, false).apply()
  }

  private fun markAppAsKilled() {
    preferences.edit().putBoolean(KEY_APP_WAS_KILLED, true).apply()
  }

  companion object {
    private const val PREFS_NAME = "biometric_lifecycle_preferences"
    private const val KEY_APP_WAS_KILLED = "key_app_was_killed"
  }
}
