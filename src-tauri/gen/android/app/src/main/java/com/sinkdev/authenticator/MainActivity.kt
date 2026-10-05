package com.sinkdev.authenticator

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    // FLAG_SECURE: Prevents screenshots, screen recordings, and obscures app snapshot in recent tasks
    window.setFlags(
      WindowManager.LayoutParams.FLAG_SECURE,
      WindowManager.LayoutParams.FLAG_SECURE
    )
    super.onCreate(savedInstanceState)
  }
}
