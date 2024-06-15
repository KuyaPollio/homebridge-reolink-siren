
<span align="center">

# Reolink Siren and Light

</span>

I've created this plugin so that you can individually turn on and off the Siren and Lights for your Reolink cameras
Currently, the only user-unfriendly thing I haven't been manage to fix is after you set up a device, you can not use the checkboxes to have the light or siren individually removed.
To resolve this issue, you have to check or uncheck the box you would like to adjust and then remove the Childbridge from your home.
After that, add the Childbridge again and you see that if you, for example, uncheck the Light for a certain camera, that it will not be displayed anymore.

I have written this plugin from a fork of Reolink Extras, because that plugin wouldn't let me turn off the light exposure to Homekit.
The exposure to Homekit from my Duo-camera caused an issue in the Reolink app where the "Night Smart Mode" would be turned on again after being "Off" when using the light via Homekit.
If you turn off the light here, it will not mess with your settings in the Reolink app anymore