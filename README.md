# Wifi Music Box OpenSource Project
Have you ever heard about Sonos Sound System? This project aims to build a wifi sound box adapter which play out the streamming music using PCM2704 and TPLink WiFi Router such as TL-MR3020 or TL-MR3040 with USB support.

**Hardware**

1. TPLink Router TL-MR3020 (http://www.tp-link.com/iq/products/details/cat-14_TL-MR3020.html)
2. USB to Audio Converter (http://www.amazon.com/USB-DAC-PCM2704-Optical-Converter/dp/B0093KZTEA)

**Firmware**

1. [Openwrt SysUpgrade Firmware for TL-MR3020](https://github.com/cuongquay/project-wifi-music-box/blob/master/openwrt/firmware/openwrt-ar71xx-generic-tl-mr3020-v1-squashfs-sysupgrade.bin) which is built to support USB 1.1, Sound Module and MadPlay only (4MB Flash Memory Size). You can find the INSTRUCTION of HOWTO flashing OpenWRT by this link https://wiki.openwrt.org/doc/howto/generic.flashing
2. Configure uhttpd web server with lua support to be able to expose REST API out of the box to the mobile application.
* After flashing TL-MR3040 by OpenWRT firmware, SSH into the system and modify the uhttpd configuration as follows:*
- $ vi /etc/config/uhttpd
- update the configuration with 
	
	config 'uhttpd' 'main'
        option 'listen_http' '80'
        option 'home'        '/www'
		...
		option lua_prefix       /api
        option lua_handler      /www/main.lua
        
**Application**
 

