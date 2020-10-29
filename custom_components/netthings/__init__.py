import logging
import socketio
import json

# The domain of the component.
DOMAIN = "netthings"

_LOGGER = logging.getLogger(__name__)

sio = socketio.Client()

def setup(hass, config):
    conf = config[DOMAIN]
    host = conf.get("host")
    url = "http://" + host
    
    @sio.event
    def connect():
        _LOGGER.debug("connection established to "  + host + " with SID " + sio.sid)
    
    @sio.on("refresh:instantaneous")
    def refresh(data):
        for channel in data:
            attributes = {
                "unit_of_measurement": channel["consumptionUnit"],
                "friendly_name": channel["channelName"],
                "Channel ID" : str(channel["channelId"]),
                "Channel Type" : channel["channelType"],
                "Current Rate" : channel["unitCostInPence"] + " p",
                "Current Cost" : "£ " + str(channel["currentCost"]),
                "Monthly Accumulated Cost" : "£ " + str(channel["monthlyAccumulatedCost"]),
                "Current Estimated CO2" : str(channel["CO2"]) + " Kg/h"
                }
            hass.states.set("sensor.netthings_channel" + str(channel["channelId"]), str(channel["consumption"]), attributes)
    
    @sio.event
    def disconnect():
        _LOGGER.debug("disconnected from " + host)
        
    sio.connect(url)

    # Return boolean to indicate that initialization was successfully.
    return True