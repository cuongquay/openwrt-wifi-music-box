# Wifi Music Box OpenSource Project
Have you ever heard about Sonos Sound System? This project aims to build a wifi sound box adapter which play out the streamming music using PCM2704 and TPLink WiFi Router such as TL-MR3020 or TL-MR3040 with USB support.

**Hardware**

1. TPLink Router TL-MR3020 (http://www.tp-link.com/iq/products/details/cat-14_TL-MR3020.html)
2. USB to Audio Converter (http://www.ebay.com/itm/PCM2704-USB-DAC-to-S-PDIF-Sound-Card-Decoder-Board-/191168663297)

**Firmware**

1. [Openwrt SysUpgrade Firmware for TL-MR3020](https://github.com/cuongquay/project-wifi-music-box/blob/master/openwrt/firmware/openwrt-ar71xx-generic-tl-mr3020-v1-squashfs-sysupgrade.bin) which is built to support USB 1.1, Sound Module and MadPlay only (4MB Flash Memory Size). You can find the INSTRUCTION of HOWTO flashing OpenWRT by this link https://wiki.openwrt.org/doc/howto/generic.flashing
2. Configure uhttpd web server with lua support to be able to expose REST API out of the box to the mobile application.

*After flashing TL-MR3040 by OpenWRT firmware, SSH into the system and modify the uhttpd configuration as follows:*

- Open file with VIM editor root@OpenWrt:~# vi /etc/config/uhttpd
- Update the configuration with the following lines
 
```javascript
	option lua_prefix       /api
	option lua_handler      /www/api/main.lua
```    

- Copy the files from [openwrt/uhttpd/](https://github.com/cuongquay/project-wifi-music-box/tree/master/openwrt/uhttpd) into /www/api/ of the TL-MR3020 system.
- Restart the uhttpd server root@OpenWrt:~# /etc/init.d/uhttpd restart to apply the configuration

**Usage**

*You can find the MP3 streamming server source from http://dir.xiph.org/by_format/MP3*

root@OpenWrt:~# wget -qO- http://198.50.250.195:7064/RADIOSATELLITE | madplay - -v --tty-control
 
Or play a MP3 stream through REST API interface

http://your_openwrt_host/api/play?url=http://198.50.250.195:7064/RADIOSATELLITE

If you can make a small application that can retrieve a MP3 stream from https://soundcloud.com/, that would be great for you to build a real life sound system likes Sonos one. I love this way!!!

 
