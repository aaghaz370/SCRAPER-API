package com.abmo.providers

import com.abmo.util.getHost
import com.abmo.util.getParameter


class AbyssToProvider: Provider {

    override fun getVideoID(url: String): String? {
        return when(url.getHost()) {
            "abysscdn.com", "playhydrax.com", "zplayer.io" -> url.getParameter("v")
            "short.ink"-> url.substringAfterLast("/")
            else -> url
        }
    }
}