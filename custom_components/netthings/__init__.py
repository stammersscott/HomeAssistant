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
                "device_class": "power",
                "state_class": "measurement",
                "unit_of_measurement": channel["consumptionUnit"],
                "friendly_name": channel["channelName"],
                "Channel ID" : str(channel["channelId"]),
                "Channel Type" : channel["channelType"]
#                "Current Rate" : channel["unitCostInPence"] + " p",
#                "Current Cost" : "£ " + str(channel["currentCost"]),
#                "Monthly Accumulated Cost" : "£ " + str(channel["monthlyAccumulatedCost"]),
#                "Current Estimated CO2" : str(channel["CO2"]) + " Kg/h"
            }
            currentrate_attributes = {
                "state_class": "measurement",
                "device_class": "monetary",
                "unit_of_measurement": channel["currency"],
                "friendly_name": channel["channelName"] + " Current Rate",
                "Channel ID" : str(channel["channelId"]),
                "Channel Type" : channel["channelType"],
                "Current Rate in Pence" : channel["unitCostInPence"] + " p"
            }
            currentcost_attributes = {
                "state_class": "measurement",
                "device_class": "monetary",
                "unit_of_measurement": channel["currency"],
                "friendly_name": channel["channelName"] + " Current Cost",
                "Channel ID" : str(channel["channelId"]),
                "Channel Type" : channel["channelType"]
            }
            cumulativecost_attributes = {
                "state_class": "measurement",
                "device_class": "monetary",
                "unit_of_measurement": channel["currency"],
                "friendly_name": channel["channelName"] + " Monthly Accumulated Cost",
                "Channel ID" : str(channel["channelId"]),
                "Channel Type" : channel["channelType"]
            }
            co2_attributes = {
                "state_class": "measurement",
                "unit_of_measurement": "Kg/h",
                "friendly_name": channel["channelName"] + " Current Estimated CO2",
                "Channel ID" : str(channel["channelId"]),
                "Channel Type" : channel["channelType"]
            }
            hass.states.set("sensor.netthings_channel" + str(channel["channelId"]), str(channel["consumption"]), attributes)
            hass.states.set("sensor.netthings_channel" + str(channel["channelId"]) + "_CurrentRate", str(float(channel["unitCostInPence"])/100), currentrate_attributes)
            hass.states.set("sensor.netthings_channel" + str(channel["channelId"]) + "_CurrentCost", str(channel["currentCost"]), currentcost_attributes)
            hass.states.set("sensor.netthings_channel" + str(channel["channelId"]) + "_MonthlyAccumulatedCost", str(channel["monthlyAccumulatedCost"]), cumulativecost_attributes)
            hass.states.set("sensor.netthings_channel" + str(channel["channelId"]) + "_EstimatedCO2", str(channel["CO2"]), co2_attributes)
    
    @sio.event
    def disconnect():
        _LOGGER.debug("disconnected from " + host)
    
    sio.connect(url)

    # Return boolean to indicate that initialization was successfully.
    return True
