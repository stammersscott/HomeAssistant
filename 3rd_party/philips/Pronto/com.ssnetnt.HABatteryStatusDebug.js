/*!
@author Scott Stammers
@title com.ssnetnt.HABatteryStatusDebug
@version 0.91
*/

// access parameters
var ha_host = CF.widget("HA_HOST_IP", "PARAMETERS", "HA_MOD").label;
var ha_port = CF.widget("HA_PORT", "PARAMETERS", "HA_MOD").label;
var ha_token = CF.widget("HA_TOKEN", "PARAMETERS", "HA_MOD").label;

var sysModel = System.getModel();
var sysSerial = System.getSerial();

var entityString = sysModel + "_" + String(sysSerial);
if (entityString === "-_-") {
    entityString = "TSUSIM_0000000000";
    sysModel = "TSUSIM";
    sysSerial = "0000000000";
}

var updateInterval = 600 * 1000; // 10min; in msec

function getDate() {
    d = new Date();
    return d.getFullYear() 
	+ "-" + ("0" + Number(d.getMonth()+1)).slice(-2) 
	+ "-" + ("0" + d.getDate()).slice(-2) 
	+ "T" + GUI.getDisplayTime() + ":" + ("0" + d.getSeconds()).slice(-2);
}

function haSetStateAttribute(entityId, state, attribute, value) {
    var request;
    request = new com.philips.HttpLibrary.HttpRequest();
    request.open("POST", "http://" + ha_host + ":" + ha_port + "/api/states/" + entityId, true);
    request.setRequestHeader("Authorization", "Bearer " + ha_token);
    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestHeader("Connection", "Close");
    request.send('{"state": "' + state + '", "attributes": {"' + attribute + '": ' + '"' + value + '", "last_update": "'  + getDate() + '", "icon": "mdi:tablet", "friendly_name": "Pronto ' + sysModel + '", "serial": "' +  String(sysSerial) + '"}}');
}

function updateHA() {
    var batLvl;
    switch (System.getBatteryStatus()) {
        case "empty":
            batLvl = "0";
            break;
        case "critical":
            batLvl = "5";
            break;
        case "level1":
            batLvl = "25";
            break;
        case "level2":
            batLvl = "50";
            break;
        case "level3":
            batLvl = "75";
            break;
        case "level4":
            batLvl = "95";
            break;
        case "max":
            batLvl = "100";
            break;
        case "charging":
            batLvl = "charging";
            break;
        default:
            batLvl = "unknown";
            break;
    }

    haSetStateAttribute("device_tracker." + entityString, "home", "battery", batLvl);
}

/*
     schedule periodic updates for when the TSU sits in the charging dock
     and it is powered on.
*/
function periodicUpdate(activity) {
    System.setDebugMask(9);
    System.print(getDate() + " [ScheduleAfter]");
    updateHA();
    activity.scheduleAfter(updateInterval, arguments.callee, activity);
}

((function () {
    // debugging
    System.setDebugMask(9);
    // the current activity.
    var myActivity = CF.activity();
    myActivity.onWake = function () {
        last = System.getGlobal('ha_last_update');
        ts = Date.now();
        if (last === null || (ts - last > 10 * 60 * 1000)) {
            System.print(getDate() + " [Wake up]");
            updateHA();
            System.setGlobal('ha_last_update', ts);
        }
    };
    System.print("Setting up scheduled updates:");
    myActivity.scheduleAfter(updateInterval, periodicUpdate, myActivity);
    System.print("Done.");

    myActivity.onExit = function () {
        var A = CF.activity();
        A.onWake = null;
        A.onExit = null;
    };

}()));
