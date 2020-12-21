/*!
   @title	com.philips.InteractiveTCPClient
   @version 2.01 
   @author Philips
 */

/**
 * Usage:
 * 
 * Create a new instance of the InteractiveTCPClient Class
 *
 *   var myTCPClient = new com.philips.InteractiveTCPClient(...) 
 *
 * using the parameters described below:
 * 
 * aProcessDataCallback
 *         the function which will process the retrieved
 *         data from the socket, note that the function will
 *         be called delimiter based, i.e. when the delimiter
 *         is found in data read from the socket
 *
 * aIOErrorCallback
 *        the function which will be called when an io error occurs
 *
 * aDelimiter
 *        a string upon receipt of which the data needs to be processed
 *
 * aIP
 *        IP address of the server
 *
 * aPort
 *        TCP Port number of the server
 *
 * aComRetries
 *        Number of retries when a failure occurs
 *
 * The trace and traceHex functions are provided for debugging purposes.
 * Use System.setDebugMask(9) to use them.
 *
 */

// Hints for the JSLint Code Quality Tool
/*jslint
    indent: 3, plusplus: false
*/

var System,
    Diagnostics,
    TCPSocket,
    com;

// create the com.philips namespace
if (!com) {
   com = {};
} else if (typeof com !== "object") {
   throw new Error("com already exist and is not an object");
}
if (!com.philips) {
   com.philips = {};
} else if (typeof com.philips !== "object") {
   throw new Error("com.philips already exist and is not an object");
}

com.philips.trace = function (aMsg, aSize)
{
   if (aSize) {
      System.print(">>>>>>>>>>>>>>>>>>>>>>");
      if (aMsg.length < aSize) {
         aSize = aMsg.length;
      }
      while (aSize > 0) {
         System.print(aMsg.slice(0, 90));
         aMsg = aMsg.slice(90);
         aSize -= 90;
      }
      System.print("<<<<<<<<<<<<<<<<<<<<<<");
   } else {
      System.print(aMsg);
      if ((aMsg !== null) && (aMsg !== undefined) &&
          (aMsg.search("rror") > 0)) {
         Diagnostics.log(aMsg);
      }
   }
};

com.philips.traceHex = function (aMsg, aSize)
{
   var newStr = "",
       i;
   for (i = 0; i < aMsg.length; i++) {
      newStr += aMsg.charCodeAt(i).toString(16) + " ";
   }
   com.philips.trace(newStr, aSize);
};

// create the InteractiveTCPClient class in the com.philips namespace
com.philips.InteractiveTCPClient = function (aProcessDataCallback,
                                             aIOErrorCallback,
                                             aDelimiter,
                                             aIP, aPort, aComRetries, aComTimeout)
{
   var that = this;
   this.delimiterSize = aDelimiter.length;
   this.delimiter = new RegExp(aDelimiter);
   this.processDataCallback = aProcessDataCallback;
   this.IOErrorCallback = aIOErrorCallback;
   this.retries = 0;
   this.ioErrorCommand = ""; //will contain the failed command
   this.socket = null;
   this.IPAddress = aIP;
   this.port = aPort;
   this.waitingForConnection = false;
   this.waitingForConnectionQueue = null;
   this.comRetries = 3;
   if (aComRetries) {
      this.comRetries = aComRetries;
   }
   this.comTimeout = 5000;
   if (aComTimeout) 
   {
      this.comTimeout = aComTimeout;
   }
   
   this.checkForIOError = function ()
   {
      if (this.ioErrorCommand !== "") {
         this.initSocket(this.ioErrorCommand);
      }
   };
   
   this.checkForStalledSocket = function ()
   {
      if (this.waitingForConnection)
      {
         if (this.retries > this.comRetries)
         {
             com.philips.trace("Please check network parameters!");
         }
         else
         {
             this.retries++;
             var command = this.socket.command;
             if (this.waitingForConnectionQueue)
             {
                 command = this.waitingForConnectionQueue.shift();
             }
             this.initSocket(command);
         }
      } 
   };
   
   this.initSocket = function (command)
   {
      try
      {
         if (this.socket) {
            this.close();
         }
         this.socket = new TCPSocket();
         this.data = "";
         this.delimiterHitIndex = -1;
         this.socket.command = command;
         this.socket.clientRef = this;
         this.socket.onConnect = this.onConnect;
         this.socket.onData = this.onData;
         this.socket.onClose = this.onClose;
         this.socket.onIOError = this.onIOError;
      } catch (e) {
         com.philips.trace("Error creating Socket in InteractiveTCPClient:\r\n" + e);
      }
      try {
         this.waitingForConnection = true;
         this.socket.connect(this.IPAddress, this.port);  
         CF.activity().scheduleAfter(this.comTimeout, function()
         {
            that.checkForStalledSocket();
         });          
      } catch (e2) {
         this.waitingForConnection = false;
         com.philips.trace("Error in execute - socket connect: " + e2);
         this.retries++;
         if (this.retries > this.comRetries) {
            com.philips.trace("Please check network parameters!");
         } else {
            this.initSocket(command);
         }
      }
   };
   
   this.onConnect = function ()
   {
      var cRef = this.clientRef; 
      cRef.waitingForConnection = false;
      cRef.retries = 0;
      cRef.ioErrorCommand = "";
      try
      {
         this.write(this.command);
         if (cRef.waitingForConnectionQueue) {
            while (cRef.waitingForConnectionQueue.length > 0) {
               this.command = cRef.waitingForConnectionQueue.shift();
               this.write(this.command);
               System.delay(200);
            }
            cRef.waitingForConnectionQueue = null;
         }
      } catch (e) {
         com.philips.trace("onConnect error: " + e);
      }
   };
   
   this.onData = function ()
   {
      var cRef = this.clientRef;
      cRef.retries = 0;
      cRef.ioErrorCommand = "";
      try {
         cRef.data += this.read();
      } catch (e) {
         com.philips.trace("Read error: " + e);
      }
      try {
         cRef.delimiterHitIndex =
            cRef.data.search(cRef.delimiter);
         while (cRef.delimiterHitIndex >= 0) 
         {
            cRef.pData =
               cRef.data.slice(0, cRef.delimiterHitIndex);
            cRef.processDataCallback.call(cRef);
            //remove before and delimiter included.
            cRef.data =
               cRef.data.slice(cRef.delimiterHitIndex +
                                         cRef.delimiterSize);
            cRef.delimiterHitIndex =
               cRef.data.search(cRef.delimiter);
         }   
      } catch (e2) {
         com.philips.trace("Error in processData callback: " + e2);
         com.philips.trace(cRef.data, 1000);
      }
   };   
   this.onClose = function ()
   {
      this.clientRef.socket = null;
   };
   this.onIOError = function (error)
   {
      var cRef = this.clientRef;
      com.philips.trace("IOError: " + error + " - retries: " +
                        cRef.retries, 500);
      cRef.retries++;
      if (cRef.retries < cRef.comRetries) {
         cRef.ioErrorCommand = this.command;
         scheduleAfter(3000, function () {
            that.checkForIOError();
         });
         com.philips.trace("ioErrorCommand = " +
                           cRef.ioErrorCommand, 500);
      } else {
         com.philips.trace("IOError: " + error);
         try {
            cRef.IOErrorCallback.call(cRef, error);   
         } catch (e) {
            com.philips.trace("Error in calling of IOError callback: " + e);
         }   
      }
   };
      
   this.close = function ()
   {
      try {
         this.data = "";
         this.socket.clientRef = null;
         this.socket.close();
         this.socket = null;
      } catch (e) {
         com.philips.trace("Error in closing of socket: " + e);
      }
   };
   
   this.execute = function (command)
   {
      if (this.socket) {
         this.socket.command = command;
         if (this.socket.connected) {
            try {
               this.socket.write(this.socket.command);
            } catch (e) {
               this.initSocket(command);
            }
         } else {
            if (this.waitingForConnection) {
               if (this.waitingForConnectionQueue === null) {
                  this.waitingForConnectionQueue = [];
               }
               this.waitingForConnectionQueue.push(command);
            }
         }
      } else {
         this.initSocket(command);
      }
   };
};
