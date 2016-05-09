# Wifi Music Box OpenSource Project
Have you ever heard about Sonos Sound System? This project aims to build a wifi sound box adapter which play out the streamming music using PCM2704 and TPLink WiFi Router such as TL-MR3020 or TL-MR3040 with USB support.

**Hardware**

	1. TPLink Router TL-MR3020 (http://www.tp-link.com/iq/products/details/cat-14_TL-MR3020.html)
	2. USB to Audio Converter (http://www.amazon.com/USB-DAC-PCM2704-Optical-Converter/dp/B0093KZTEA)

**Firmware**

	1. Openwrt [SysUpgrade](https://github.com/cuongquay/project-wifi-music-box/blob/master/openwrt/firmware/openwrt-ar71xx-generic-tl-mr3020-v1-squashfs-sysupgrade.bin) firmware for TL-MR3020 which is built to support USB 1.1, Sound Module and MadPlay only (4MB flash)
	2. uhttpd web server with lua support to be able to expose REST API out of the box to the mobile application.

**Application**
 

