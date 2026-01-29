package com.familychores

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BiometricLifecycleModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private val application: MainApplication?
    get() = reactApplicationContext.applicationContext as? MainApplication

  override fun getName(): String = "BiometricLifecycle"

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun shouldShowBiometric(): Boolean {
    return application?.shouldShowBiometric() ?: false
  }

  @ReactMethod
  fun markBiometricShown() {
    application?.markBiometricShown()
  }
}
