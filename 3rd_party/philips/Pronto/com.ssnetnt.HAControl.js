/*!
@title com.ssnetnt.HAControl
@author Scott Stammers
@version 0.9
*/

/*
---------------------------------------------------------------------------
    Home Assistant communication functions
---------------------------------------------------------------------------
*/

// access parameters
var ha_host = CF.widget("HA_HOST_IP", "PARAMETERS", "HA_MOD").label;
var ha_port = CF.widget("HA_PORT", "PARAMETERS", "HA_MOD").label;
var ha_token = CF.widget("HA_TOKEN", "PARAMETERS", "HA_MOD").label;
var ha_name = CF.widget("HA_NAME", "PARAMETERS", "HA_MOD").label;

/* call a specific domain/service through HA API for a given entity, e.g. "light", "turn_on", "light.spotlights" */
function haService (domain, service, entityId) {
    request = new com.philips.HttpLibrary.HttpRequest();
    request.open("POST", "http://" + ha_host + ":" + ha_port + "/api/services/" + domain + "/" + service, true);
    request.setRequestHeader("Authorization", "Bearer " + ha_token);
    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestHeader("Connection", "Close");
    request.send('{"entity_id": "' +  entityId + '"}');
}

function haSetState(entityId, state) {
    request = new com.philips.HttpLibrary.HttpRequest();
    request.open("POST", "http://" + ha_host + ":" + ha_port + "/api/states/" + entityId, true);
    request.setRequestHeader("Authorization", "Bearer " + ha_token);
    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestHeader("Connection", "Close");
	request.send('{"state": "' +  state + '"}');
}

function haSetAttribute(entityId, attribute, value) {
    request = new com.philips.HttpLibrary.HttpRequest();
    request.open("POST", "http://" + ha_host + ":" + ha_port + "/api/states/" + entityId, true);
    request.setRequestHeader("Authorization", "Bearer " + ha_token);
    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestHeader("Connection", "Close");
    request.send('{"state": "home", "attributes": {"' + attribute + '": ' + '"' + value + '"}}');
}

function haLightSetBrightness(entityId, pct) {
	if (pct  >= 0 && pct <= 100) {
		request = new com.philips.HttpLibrary.HttpRequest();
		request.open("POST", "http://" + ha_host + ":" + ha_port + "/api/services/light/turn_on", true);
		request.setRequestHeader("Authorization", "Bearer " + ha_token);
		request.setRequestHeader("Content-Type", "application/json");
		request.setRequestHeader("Connection", "Close");
		request.send('{"entity_id": "' +  entityId + '",'
						+ '"brightness_pct":' + '"' + pct + '"'
						+ '}');
	}
}

function haLightBrightnessStep(entityId, delta_pct) {
    request = new com.philips.HttpLibrary.HttpRequest();
    request.open("POST", "http://" + ha_host + ":" + ha_port + "/api/services/light/turn_on", true);
    request.setRequestHeader("Authorization", "Bearer " + ha_token);
    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestHeader("Connection", "Close");
    request.send('{"entity_id": "' +  entityId + '",'
                    + '"brightness_step_pct":' + '"' + delta_pct + '"'
                    + '}');
}

var stateRequest = {};
function getState(entityId) {
    //System.setDebugMask(9);
    //System.print("GetState: " + entityId);
    stateRequest[entityId] = new com.philips.HttpLibrary.HttpRequest();
    stateRequest[entityId].open("GET", "http://" + ha_host + ":" + ha_port + "/api/states/" + entityId, true);
    stateRequest[entityId].setRequestHeader("Authorization", "Bearer " + ha_token);
    stateRequest[entityId].setRequestHeader("Content-Type", "application/json");
    stateRequest[entityId].setRequestHeader("Connection", "Close");

    var state;
    stateRequest[entityId].onreadystatechange = function() {
        if (stateRequest[entityId].readyState == 4 && stateRequest[entityId].status == 200) {
            //System.print("Response: " + entityId)
            regex = /"state": "(\w+)"/;
            state = (stateRequest[entityId].responseText).match(regex)[1];
            if (state == "on") {
                CF.widget(entityId).setImage(IMG_ON);
                CF.widget(entityId).label = "on";
            } else {
                CF.widget(entityId).setImage(IMG_OFF);
                CF.widget(entityId).label = "off";
            }
            delete stateRequest[entityId];
        }
    }
    stateRequest[entityId].send();
};

function haSetScene(roomName, scnName) {
    request = new com.philips.HttpLibrary.HttpRequest();
    request.open("POST", "http://" + ha_host + ":" + ha_port + "/api/services/hue/hue_activate_scene", true);
    request.setRequestHeader("Authorization", "Bearer " + ha_token);
    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestHeader("Connection", "Close");
	request.send('{"group_name": "' +  roomName + '", "scene_name": "' + scnName  + '"}');
};

// return the brightness value for a single lamp
function haGetBrightness(entityId) {
    stateRequest[entityId] = new com.philips.HttpLibrary.HttpRequest();
    stateRequest[entityId].open("GET", "http://" + ha_host + ":" + ha_port + "/api/states/" + entityId, true);
    stateRequest[entityId].setRequestHeader("Authorization", "Bearer " + ha_token);
    stateRequest[entityId].setRequestHeader("Content-Type", "application/json");

    var state;
    stateRequest[entityId].onreadystatechange = function() {
        if (stateRequest[entityId].readyState == 4 && stateRequest[entityId].status == 200) {
            // only turned on lamps have 'brightness' attribute, so let's check
            // the lamp's state before trying to read the bri value
            regex = /"state": "(\w+)"/;
            state = (stateRequest[entityId].responseText).match(regex)[1];
            if (state == "on") {
                regex = /"brightness": (\d+)/;
                bri = (stateRequest[entityId].responseText).match(regex)[1];
                System.setGlobal('activelight_bri', Math.ceil(bri / 254 * 100));
            }
            delete stateRequest[entityId];
        }
    }
    stateRequest[entityId].send();
};

/*
// we need to have an exit condition for the scheduleAfter() function;
// beware of onEntry as that's run after the page script;
// this needs to be a counter to avoid setting multiple timers with accidental double-taps
(function(){
    CF.page().onExit = function(){
                        pageChanged++;
                        // invalidate all .onreadystatechange callbacks when exiting the page
                        for (req in stateRequest) {
                            delete stateRequest.req;
                        }
                    };
}());
*/