"use strict";

var storeHandlers = require("./handlers/store");

module.exports = function(connection, parsed, data, callback) {
    if (!parsed.attributes ||
        parsed.attributes.length !== 3 ||
        !parsed.attributes[0] ||
        ["ATOM", "SEQUENCE"].indexOf(parsed.attributes[0].type) < 0 ||
        !parsed.attributes[1] ||
        (["ATOM"].indexOf(parsed.attributes[1].type) < 0) ||
        !parsed.attributes[2] ||
        !(["ATOM", "STRING"].indexOf(parsed.attributes[2].type) >= 0 || Array.isArray(parsed.attributes[2]))
    ) {

        connection.send({
            tag: parsed.tag,
            command: "BAD",
            attributes: [{
                type: "TEXT",
                value: "UID STORE expects sequence set, item name and item value"
            }]
        }, "INVALID COMMAND", parsed, data);
        return callback();
    }

    if (connection.state !== "Selected") {
        connection.send({
            tag: parsed.tag,
            command: "BAD",
            attributes: [{
                type: "TEXT",
                value: "Select mailbox first"
            }]
        }, "UID STORE FAILED", parsed, data);
        return callback();
    }

		var itemName = (parsed.attributes[1].value || "").toUpperCase(),
		    itemValue = [].concat(parsed.attributes[2] || []),
				handler = connection.server.storeHandlers[itemName] || storeHandlers[itemName];

		// make sure it is a valid type
		try {
	    itemValue.forEach(function(item, i) {
	        if (!item || ["STRING", "ATOM"].indexOf(item.type) < 0) {
	            throw new Error("Invalid item value #" + (i + 1));
	        }
	    });
			// make sure it was a valid STORE argument type
	    if (!handler) {
	        throw new Error("Invalid STORE argument " + itemName);
	    }
		} catch (E) {
      connection.send({
          tag: parsed.tag,
          command: "BAD",
          attributes: [{
              type: "TEXT",
              value: E.message
          }]
      }, "UID STORE FAILED", parsed, data);
      return callback();
		}

    handler(connection, parsed.attributes[0].value, true, itemValue, parsed, data, function(err,d){
    	if (err) {
	      connection.send({
	          tag: parsed.tag,
	          command: "BAD",
	          attributes: [{
	              type: "TEXT",
	              value: err
	          }]
	      }, "UID STORE FAILED", parsed, data);
	      return callback();
    	}
		  connection.send({
		      tag: parsed.tag,
		      command: "OK",
		      attributes: [{
		          type: "TEXT",
		          value: "UID STORE completed"
		      }]
		  }, "UID STORE COMPLETE", parsed, data, d);

		  callback();
    });
	};