(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/* global tinyMCE */
/* global wpseoShortcodePluginL10n */
/* global ajaxurl */
/* global _ */
/* global JSON */
/* global console */
(function () {
	"use strict";

	/**
  * The Yoast Shortcode plugin parses the shortcodes in a given piece of text. It analyzes multiple input fields for shortcodes which it will preload using AJAX.
  *
  * @constructor
  * @property {RegExp} keywordRegex Used to match a given string for valid shortcode keywords.
  * @property {RegExp} closingTagRegex Used to match a given string for shortcode closing tags.
  * @property {RegExp} nonCaptureRegex Used to match a given string for non capturing shortcodes.
  * @property {Array} parsedShortcodes Used to store parsed shortcodes.
  */

	var YoastShortcodePlugin = function YoastShortcodePlugin(app) {
		this._app = app;

		this._app.registerPlugin("YoastShortcodePlugin", { status: "loading" });
		this.bindElementEvents();

		var keywordRegexString = "(" + wpseoShortcodePluginL10n.wpseo_shortcode_tags.join("|") + ")";

		// The regex for matching shortcodes based on the available shortcode keywords.
		this.keywordRegex = new RegExp(keywordRegexString, "g");
		this.closingTagRegex = new RegExp("\\[\\/" + keywordRegexString + "\\]", "g");
		this.nonCaptureRegex = new RegExp("\\[" + keywordRegexString + "[^\\]]*?\\]", "g");

		this.parsedShortcodes = [];

		this.loadShortcodes(this.declareReady.bind(this));
	};

	/* YOAST SEO CLIENT */

	/**
  * Declares ready with YoastSEO.
  *
  * @returns {void}
  */
	YoastShortcodePlugin.prototype.declareReady = function () {
		this._app.pluginReady("YoastShortcodePlugin");
		this.registerModifications();
	};

	/**
  * Declares reloaded with YoastSEO.
  *
  * @returns {void}
  */
	YoastShortcodePlugin.prototype.declareReloaded = function () {
		this._app.pluginReloaded("YoastShortcodePlugin");
	};

	/**
  * Registers the modifications for the content in which we want to replace shortcodes.
  *
  * @returns {void}
  */
	YoastShortcodePlugin.prototype.registerModifications = function () {
		this._app.registerModification("content", this.replaceShortcodes.bind(this), "YoastShortcodePlugin");
	};

	/**
  * The callback used to replace the shortcodes.
  *
  * @param {string} data
  * @returns {string}
  */
	YoastShortcodePlugin.prototype.replaceShortcodes = function (data) {
		var parsedShortcodes = this.parsedShortcodes;

		if (typeof data === "string" && parsedShortcodes.length > 0) {
			for (var i = 0; i < parsedShortcodes.length; i++) {
				data = data.replace(parsedShortcodes[i].shortcode, parsedShortcodes[i].output);
			}
		}

		return data;
	};

	/* DATA SOURCING */

	/**
  * Get data from inputfields and store them in an analyzerData object. This object will be used to fill
  * the analyzer and the snippetpreview
  *
  * @param {function} callback To declare either ready or reloaded after parsing.
  *
  * @returns {void}
  */
	YoastShortcodePlugin.prototype.loadShortcodes = function (callback) {
		var unparsedShortcodes = this.getUnparsedShortcodes(this.getShortcodes(this.getContentTinyMCE()));
		if (unparsedShortcodes.length > 0) {
			this.parseShortcodes(unparsedShortcodes, callback);
		} else {
			return callback();
		}
	};

	/**
  * Bind elements to be able to reload the dataset if shortcodes get added.
  *
  * @returns {void}
  */
	YoastShortcodePlugin.prototype.bindElementEvents = function () {
		var contentElement = document.getElementById("content") || false;
		var callback = _.debounce(this.loadShortcodes.bind(this, this.declareReloaded.bind(this)), 500);

		if (contentElement) {
			contentElement.addEventListener("keyup", callback);
			contentElement.addEventListener("change", callback);
		}

		if (typeof tinyMCE !== "undefined" && typeof tinyMCE.on === "function") {
			tinyMCE.on("addEditor", function (e) {
				e.editor.on("change", callback);
				e.editor.on("keyup", callback);
			});
		}
	};

	/**
  * gets content from the content field, if tinyMCE is initialized, use the getContent function to get the data from tinyMCE
  * @returns {String}
  */
	YoastShortcodePlugin.prototype.getContentTinyMCE = function () {
		var val = document.getElementById("content") && document.getElementById("content").value || "";
		if (typeof tinyMCE !== "undefined" && typeof tinyMCE.editors !== "undefined" && tinyMCE.editors.length !== 0) {
			val = tinyMCE.get("content") && tinyMCE.get("content").getContent() || "";
		}

		return val;
	};

	/* SHORTCODE PARSING */

	/**
  * Returns the unparsed shortcodes out of a collection of shortcodes.
  *
  * @param {Array} shortcodes
  * @returns {Array}
  */
	YoastShortcodePlugin.prototype.getUnparsedShortcodes = function (shortcodes) {
		if ((typeof shortcodes === "undefined" ? "undefined" : _typeof(shortcodes)) !== "object") {
			console.error("Failed to get unparsed shortcodes. Expected parameter to be an array, instead received " + (typeof shortcodes === "undefined" ? "undefined" : _typeof(shortcodes)));
			return false;
		}

		var unparsedShortcodes = [];

		for (var i = 0; i < shortcodes.length; i++) {
			var shortcode = shortcodes[i];
			if (unparsedShortcodes.indexOf(shortcode) === -1 && this.isUnparsedShortcode(shortcode)) {
				unparsedShortcodes.push(shortcode);
			}
		}

		return unparsedShortcodes;
	};

	/**
  * Checks if a given shortcode was already parsed.
  *
  * @param {string} shortcode
  * @returns {boolean}
  */
	YoastShortcodePlugin.prototype.isUnparsedShortcode = function (shortcode) {
		var already_exists = false;

		for (var i = 0; i < this.parsedShortcodes.length; i++) {
			if (this.parsedShortcodes[i].shortcode === shortcode) {
				already_exists = true;
			}
		}

		return already_exists === false;
	};

	/**
  * Gets the shortcodes from a given piece of text.
  *
  * @param {string} text
  * @returns {array} The matched shortcodes
  */
	YoastShortcodePlugin.prototype.getShortcodes = function (text) {
		if (typeof text !== "string") {
			/* jshint ignore:start */
			console.error("Failed to get shortcodes. Expected parameter to be a string, instead received" + (typeof text === "undefined" ? "undefined" : _typeof(text)));
			/* jshint ignore:end*/
			return false;
		}

		var captures = this.matchCapturingShortcodes(text);

		// Remove the capturing shortcodes from the text before trying to match the capturing shortcodes.
		for (var i = 0; i < captures.length; i++) {
			text = text.replace(captures[i], "");
		}

		var nonCaptures = this.matchNonCapturingShortcodes(text);

		return captures.concat(nonCaptures);
	};

	/**
  * Matches the capturing shortcodes from a given piece of text.
  *
  * @param {string} text
  * @returns {Array}
  */
	YoastShortcodePlugin.prototype.matchCapturingShortcodes = function (text) {
		var captures = [];

		// First identify which tags are being used in a capturing shortcode by looking for closing tags.
		var captureKeywords = (text.match(this.closingTagRegex) || []).join(" ").match(this.keywordRegex) || [];

		// Fetch the capturing shortcodes and strip them from the text so we can easily match the non capturing shortcodes.
		for (var i = 0; i < captureKeywords.length; i++) {
			var captureKeyword = captureKeywords[i];
			var captureRegex = "\\[" + captureKeyword + "[^\\]]*?\\].*?\\[\\/" + captureKeyword + "\\]";
			var matches = text.match(new RegExp(captureRegex, "g")) || [];

			captures = captures.concat(matches);
		}

		return captures;
	};

	/**
  * Matches the non capturing shortcodes from a given piece of text.
  *
  * @param {string} text
  * @returns {Array}
  */
	YoastShortcodePlugin.prototype.matchNonCapturingShortcodes = function (text) {
		return text.match(this.nonCaptureRegex) || [];
	};

	/**
  * Parses the unparsed shortcodes through AJAX and clears them.
  *
  * @param {Array} shortcodes shortcodes to be parsed.
  * @param {function} callback function to be called in the context of the AJAX callback.
  *
  * @returns {void}
  */
	YoastShortcodePlugin.prototype.parseShortcodes = function (shortcodes, callback) {
		if (typeof callback !== "function") {
			/* jshint ignore:start */
			console.error("Failed to parse shortcodes. Expected parameter to be a function, instead received " + (typeof callback === "undefined" ? "undefined" : _typeof(callback)));
			/* jshint ignore:end */
			return false;
		}

		if ((typeof shortcodes === "undefined" ? "undefined" : _typeof(shortcodes)) === "object" && shortcodes.length > 0) {
			jQuery.post(ajaxurl, {
				action: "wpseo_filter_shortcodes",
				_wpnonce: wpseoShortcodePluginL10n.wpseo_filter_shortcodes_nonce,
				data: shortcodes
			}, function (shortcodeResults) {
				this.saveParsedShortcodes(shortcodeResults, callback);
			}.bind(this));
		} else {
			return callback();
		}
	};

	/**
  * Saves the shortcodes that were parsed with AJAX to `this.parsedShortcodes`
  *
  * @param {Array} shortcodeResults
  * @param {function} callback
  *
  * @returns {void}
  */
	YoastShortcodePlugin.prototype.saveParsedShortcodes = function (shortcodeResults, callback) {
		shortcodeResults = JSON.parse(shortcodeResults);
		for (var i = 0; i < shortcodeResults.length; i++) {
			this.parsedShortcodes.push(shortcodeResults[i]);
		}

		callback();
	};

	window.YoastShortcodePlugin = YoastShortcodePlugin;
})();

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqc1xcc3JjXFx3cC1zZW8tc2hvcnRjb2RlLXBsdWdpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDRSxhQUFXO0FBQ1o7O0FBRUE7Ozs7Ozs7Ozs7QUFTQSxLQUFJLHVCQUF1QixTQUF2QixvQkFBdUIsQ0FBVSxHQUFWLEVBQWdCO0FBQzFDLE9BQUssSUFBTCxHQUFZLEdBQVo7O0FBRUEsT0FBSyxJQUFMLENBQVUsY0FBVixDQUEwQixzQkFBMUIsRUFBa0QsRUFBRSxRQUFRLFNBQVYsRUFBbEQ7QUFDQSxPQUFLLGlCQUFMOztBQUVBLE1BQUkscUJBQXFCLE1BQU0seUJBQXlCLG9CQUF6QixDQUE4QyxJQUE5QyxDQUFvRCxHQUFwRCxDQUFOLEdBQWtFLEdBQTNGOztBQUVBO0FBQ0EsT0FBSyxZQUFMLEdBQW9CLElBQUksTUFBSixDQUFZLGtCQUFaLEVBQWdDLEdBQWhDLENBQXBCO0FBQ0EsT0FBSyxlQUFMLEdBQXVCLElBQUksTUFBSixDQUFZLFdBQVcsa0JBQVgsR0FBZ0MsS0FBNUMsRUFBbUQsR0FBbkQsQ0FBdkI7QUFDQSxPQUFLLGVBQUwsR0FBdUIsSUFBSSxNQUFKLENBQVksUUFBUSxrQkFBUixHQUE2QixhQUF6QyxFQUF3RCxHQUF4RCxDQUF2Qjs7QUFFQSxPQUFLLGdCQUFMLEdBQXdCLEVBQXhCOztBQUVBLE9BQUssY0FBTCxDQUFxQixLQUFLLFlBQUwsQ0FBa0IsSUFBbEIsQ0FBd0IsSUFBeEIsQ0FBckI7QUFDQSxFQWhCRDs7QUFrQkE7O0FBRUE7Ozs7O0FBS0Esc0JBQXFCLFNBQXJCLENBQStCLFlBQS9CLEdBQThDLFlBQVc7QUFDeEQsT0FBSyxJQUFMLENBQVUsV0FBVixDQUF1QixzQkFBdkI7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NEIsaUJBQWtCLENBQWxCLENBQTVCO0FBQ0E7O0FBRUQ7QUFDQSxFQVBEOztBQVNBLFFBQU8sb0JBQVAsR0FBOEIsb0JBQTlCO0FBQ0EsQ0E5UkMsR0FBRiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBnbG9iYWwgdGlueU1DRSAqL1xyXG4vKiBnbG9iYWwgd3BzZW9TaG9ydGNvZGVQbHVnaW5MMTBuICovXHJcbi8qIGdsb2JhbCBhamF4dXJsICovXHJcbi8qIGdsb2JhbCBfICovXHJcbi8qIGdsb2JhbCBKU09OICovXHJcbi8qIGdsb2JhbCBjb25zb2xlICovXHJcbiggZnVuY3Rpb24oKSB7XHJcblx0XCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBZb2FzdCBTaG9ydGNvZGUgcGx1Z2luIHBhcnNlcyB0aGUgc2hvcnRjb2RlcyBpbiBhIGdpdmVuIHBpZWNlIG9mIHRleHQuIEl0IGFuYWx5emVzIG11bHRpcGxlIGlucHV0IGZpZWxkcyBmb3Igc2hvcnRjb2RlcyB3aGljaCBpdCB3aWxsIHByZWxvYWQgdXNpbmcgQUpBWC5cclxuXHQgKlxyXG5cdCAqIEBjb25zdHJ1Y3RvclxyXG5cdCAqIEBwcm9wZXJ0eSB7UmVnRXhwfSBrZXl3b3JkUmVnZXggVXNlZCB0byBtYXRjaCBhIGdpdmVuIHN0cmluZyBmb3IgdmFsaWQgc2hvcnRjb2RlIGtleXdvcmRzLlxyXG5cdCAqIEBwcm9wZXJ0eSB7UmVnRXhwfSBjbG9zaW5nVGFnUmVnZXggVXNlZCB0byBtYXRjaCBhIGdpdmVuIHN0cmluZyBmb3Igc2hvcnRjb2RlIGNsb3NpbmcgdGFncy5cclxuXHQgKiBAcHJvcGVydHkge1JlZ0V4cH0gbm9uQ2FwdHVyZVJlZ2V4IFVzZWQgdG8gbWF0Y2ggYSBnaXZlbiBzdHJpbmcgZm9yIG5vbiBjYXB0dXJpbmcgc2hvcnRjb2Rlcy5cclxuXHQgKiBAcHJvcGVydHkge0FycmF5fSBwYXJzZWRTaG9ydGNvZGVzIFVzZWQgdG8gc3RvcmUgcGFyc2VkIHNob3J0Y29kZXMuXHJcblx0ICovXHJcblx0dmFyIFlvYXN0U2hvcnRjb2RlUGx1Z2luID0gZnVuY3Rpb24oIGFwcCApIHtcclxuXHRcdHRoaXMuX2FwcCA9IGFwcDtcclxuXHJcblx0XHR0aGlzLl9hcHAucmVnaXN0ZXJQbHVnaW4oIFwiWW9hc3RTaG9ydGNvZGVQbHVnaW5cIiwgeyBzdGF0dXM6IFwibG9hZGluZ1wiIH0gKTtcclxuXHRcdHRoaXMuYmluZEVsZW1lbnRFdmVudHMoKTtcclxuXHJcblx0XHR2YXIga2V5d29yZFJlZ2V4U3RyaW5nID0gXCIoXCIgKyB3cHNlb1Nob3J0Y29kZVBsdWdpbkwxMG4ud3BzZW9fc2hvcnRjb2RlX3RhZ3Muam9pbiggXCJ8XCIgKSArIFwiKVwiO1xyXG5cclxuXHRcdC8vIFRoZSByZWdleCBmb3IgbWF0Y2hpbmcgc2hvcnRjb2RlcyBiYXNlZCBvbiB0aGUgYXZhaWxhYmxlIHNob3J0Y29kZSBrZXl3b3Jkcy5cclxuXHRcdHRoaXMua2V5d29yZFJlZ2V4ID0gbmV3IFJlZ0V4cCgga2V5d29yZFJlZ2V4U3RyaW5nLCBcImdcIiApO1xyXG5cdFx0dGhpcy5jbG9zaW5nVGFnUmVnZXggPSBuZXcgUmVnRXhwKCBcIlxcXFxbXFxcXC9cIiArIGtleXdvcmRSZWdleFN0cmluZyArIFwiXFxcXF1cIiwgXCJnXCIgKTtcclxuXHRcdHRoaXMubm9uQ2FwdHVyZVJlZ2V4ID0gbmV3IFJlZ0V4cCggXCJcXFxcW1wiICsga2V5d29yZFJlZ2V4U3RyaW5nICsgXCJbXlxcXFxdXSo/XFxcXF1cIiwgXCJnXCIgKTtcclxuXHJcblx0XHR0aGlzLnBhcnNlZFNob3J0Y29kZXMgPSBbXTtcclxuXHJcblx0XHR0aGlzLmxvYWRTaG9ydGNvZGVzKCB0aGlzLmRlY2xhcmVSZWFkeS5iaW5kKCB0aGlzICkgKTtcclxuXHR9O1xyXG5cclxuXHQvKiBZT0FTVCBTRU8gQ0xJRU5UICovXHJcblxyXG5cdC8qKlxyXG5cdCAqIERlY2xhcmVzIHJlYWR5IHdpdGggWW9hc3RTRU8uXHJcblx0ICpcclxuXHQgKiBAcmV0dXJucyB7dm9pZH1cclxuXHQgKi9cclxuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUuZGVjbGFyZVJlYWR5ID0gZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLl9hcHAucGx1Z2luUmVhZHkoIFwiWW9hc3RTaG9ydGNvZGVQbHVnaW5cIiApO1xyXG5cdFx0dGhpcy5yZWdpc3Rlck1vZGlmaWNhdGlvbnMoKTtcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBEZWNsYXJlcyByZWxvYWRlZCB3aXRoIFlvYXN0U0VPLlxyXG5cdCAqXHJcblx0ICogQHJldHVybnMge3ZvaWR9XHJcblx0ICovXHJcblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLmRlY2xhcmVSZWxvYWRlZCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5fYXBwLnBsdWdpblJlbG9hZGVkKCBcIllvYXN0U2hvcnRjb2RlUGx1Z2luXCIgKTtcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBSZWdpc3RlcnMgdGhlIG1vZGlmaWNhdGlvbnMgZm9yIHRoZSBjb250ZW50IGluIHdoaWNoIHdlIHdhbnQgdG8gcmVwbGFjZSBzaG9ydGNvZGVzLlxyXG5cdCAqXHJcblx0ICogQHJldHVybnMge3ZvaWR9XHJcblx0ICovXHJcblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLnJlZ2lzdGVyTW9kaWZpY2F0aW9ucyA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5fYXBwLnJlZ2lzdGVyTW9kaWZpY2F0aW9uKCBcImNvbnRlbnRcIiwgdGhpcy5yZXBsYWNlU2hvcnRjb2Rlcy5iaW5kKCB0aGlzICksIFwiWW9hc3RTaG9ydGNvZGVQbHVnaW5cIiApO1xyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBjYWxsYmFjayB1c2VkIHRvIHJlcGxhY2UgdGhlIHNob3J0Y29kZXMuXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge3N0cmluZ30gZGF0YVxyXG5cdCAqIEByZXR1cm5zIHtzdHJpbmd9XHJcblx0ICovXHJcblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLnJlcGxhY2VTaG9ydGNvZGVzID0gZnVuY3Rpb24oIGRhdGEgKSB7XHJcblx0XHR2YXIgcGFyc2VkU2hvcnRjb2RlcyA9IHRoaXMucGFyc2VkU2hvcnRjb2RlcztcclxuXHJcblx0XHRpZiAoIHR5cGVvZiBkYXRhID09PSBcInN0cmluZ1wiICYmIHBhcnNlZFNob3J0Y29kZXMubGVuZ3RoID4gMCApIHtcclxuXHRcdFx0Zm9yICggdmFyIGkgPSAwOyBpIDwgcGFyc2VkU2hvcnRjb2Rlcy5sZW5ndGg7IGkrKyApIHtcclxuXHRcdFx0XHRkYXRhID0gZGF0YS5yZXBsYWNlKCBwYXJzZWRTaG9ydGNvZGVzWyBpIF0uc2hvcnRjb2RlLCBwYXJzZWRTaG9ydGNvZGVzWyBpIF0ub3V0cHV0ICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZGF0YTtcclxuXHR9O1xyXG5cclxuXHQvKiBEQVRBIFNPVVJDSU5HICovXHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBkYXRhIGZyb20gaW5wdXRmaWVsZHMgYW5kIHN0b3JlIHRoZW0gaW4gYW4gYW5hbHl6ZXJEYXRhIG9iamVjdC4gVGhpcyBvYmplY3Qgd2lsbCBiZSB1c2VkIHRvIGZpbGxcclxuXHQgKiB0aGUgYW5hbHl6ZXIgYW5kIHRoZSBzbmlwcGV0cHJldmlld1xyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgVG8gZGVjbGFyZSBlaXRoZXIgcmVhZHkgb3IgcmVsb2FkZWQgYWZ0ZXIgcGFyc2luZy5cclxuXHQgKlxyXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxyXG5cdCAqL1xyXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5sb2FkU2hvcnRjb2RlcyA9IGZ1bmN0aW9uKCBjYWxsYmFjayApIHtcclxuXHRcdHZhciB1bnBhcnNlZFNob3J0Y29kZXMgPSB0aGlzLmdldFVucGFyc2VkU2hvcnRjb2RlcyggdGhpcy5nZXRTaG9ydGNvZGVzKCB0aGlzLmdldENvbnRlbnRUaW55TUNFKCkgKSApO1xyXG5cdFx0aWYgKCB1bnBhcnNlZFNob3J0Y29kZXMubGVuZ3RoID4gMCApIHtcclxuXHRcdFx0dGhpcy5wYXJzZVNob3J0Y29kZXMoIHVucGFyc2VkU2hvcnRjb2RlcywgY2FsbGJhY2sgKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiBjYWxsYmFjaygpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIEJpbmQgZWxlbWVudHMgdG8gYmUgYWJsZSB0byByZWxvYWQgdGhlIGRhdGFzZXQgaWYgc2hvcnRjb2RlcyBnZXQgYWRkZWQuXHJcblx0ICpcclxuXHQgKiBAcmV0dXJucyB7dm9pZH1cclxuXHQgKi9cclxuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUuYmluZEVsZW1lbnRFdmVudHMgPSBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBjb250ZW50RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcImNvbnRlbnRcIiApIHx8IGZhbHNlO1xyXG5cdFx0dmFyIGNhbGxiYWNrID0gIF8uZGVib3VuY2UoXHR0aGlzLmxvYWRTaG9ydGNvZGVzLmJpbmQoIHRoaXMsIHRoaXMuZGVjbGFyZVJlbG9hZGVkLmJpbmQoIHRoaXMgKSApLCA1MDAgKTtcclxuXHJcblx0XHRpZiAoIGNvbnRlbnRFbGVtZW50ICkge1xyXG5cdFx0XHRjb250ZW50RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCBcImtleXVwXCIsIGNhbGxiYWNrICk7XHJcblx0XHRcdGNvbnRlbnRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoIFwiY2hhbmdlXCIsIGNhbGxiYWNrICk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoIHR5cGVvZiB0aW55TUNFICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiB0aW55TUNFLm9uID09PSBcImZ1bmN0aW9uXCIgKSB7XHJcblx0XHRcdHRpbnlNQ0Uub24oIFwiYWRkRWRpdG9yXCIsIGZ1bmN0aW9uKCBlICkge1xyXG5cdFx0XHRcdGUuZWRpdG9yLm9uKCBcImNoYW5nZVwiLCBjYWxsYmFjayApO1xyXG5cdFx0XHRcdGUuZWRpdG9yLm9uKCBcImtleXVwXCIsIGNhbGxiYWNrICk7XHJcblx0XHRcdH0gKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBnZXRzIGNvbnRlbnQgZnJvbSB0aGUgY29udGVudCBmaWVsZCwgaWYgdGlueU1DRSBpcyBpbml0aWFsaXplZCwgdXNlIHRoZSBnZXRDb250ZW50IGZ1bmN0aW9uIHRvIGdldCB0aGUgZGF0YSBmcm9tIHRpbnlNQ0VcclxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfVxyXG5cdCAqL1xyXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5nZXRDb250ZW50VGlueU1DRSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIHZhbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcImNvbnRlbnRcIiApICYmIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBcImNvbnRlbnRcIiApLnZhbHVlIHx8IFwiXCI7XHJcblx0XHRpZiAoIHR5cGVvZiB0aW55TUNFICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiB0aW55TUNFLmVkaXRvcnMgIT09IFwidW5kZWZpbmVkXCIgJiYgdGlueU1DRS5lZGl0b3JzLmxlbmd0aCAhPT0gMCApIHtcclxuXHRcdFx0dmFsID0gdGlueU1DRS5nZXQoIFwiY29udGVudFwiICkgJiYgdGlueU1DRS5nZXQoIFwiY29udGVudFwiICkuZ2V0Q29udGVudCgpIHx8IFwiXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHZhbDtcclxuXHR9O1xyXG5cclxuXHQvKiBTSE9SVENPREUgUEFSU0lORyAqL1xyXG5cclxuXHQvKipcclxuXHQgKiBSZXR1cm5zIHRoZSB1bnBhcnNlZCBzaG9ydGNvZGVzIG91dCBvZiBhIGNvbGxlY3Rpb24gb2Ygc2hvcnRjb2Rlcy5cclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7QXJyYXl9IHNob3J0Y29kZXNcclxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XHJcblx0ICovXHJcblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLmdldFVucGFyc2VkU2hvcnRjb2RlcyA9IGZ1bmN0aW9uKCBzaG9ydGNvZGVzICkge1xyXG5cdFx0aWYgKCB0eXBlb2Ygc2hvcnRjb2RlcyAhPT0gXCJvYmplY3RcIiApIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvciggXCJGYWlsZWQgdG8gZ2V0IHVucGFyc2VkIHNob3J0Y29kZXMuIEV4cGVjdGVkIHBhcmFtZXRlciB0byBiZSBhbiBhcnJheSwgaW5zdGVhZCByZWNlaXZlZCBcIiArIHR5cGVvZiBzaG9ydGNvZGVzICk7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgdW5wYXJzZWRTaG9ydGNvZGVzID0gW107XHJcblxyXG5cdFx0Zm9yICggdmFyIGkgPSAwOyBpIDwgc2hvcnRjb2Rlcy5sZW5ndGg7IGkrKyApIHtcclxuXHRcdFx0dmFyIHNob3J0Y29kZSA9IHNob3J0Y29kZXNbIGkgXTtcclxuXHRcdFx0aWYgKCB1bnBhcnNlZFNob3J0Y29kZXMuaW5kZXhPZiggc2hvcnRjb2RlICkgPT09IC0xICYmIHRoaXMuaXNVbnBhcnNlZFNob3J0Y29kZSggc2hvcnRjb2RlICkgKSB7XHJcblx0XHRcdFx0dW5wYXJzZWRTaG9ydGNvZGVzLnB1c2goIHNob3J0Y29kZSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHVucGFyc2VkU2hvcnRjb2RlcztcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBDaGVja3MgaWYgYSBnaXZlbiBzaG9ydGNvZGUgd2FzIGFscmVhZHkgcGFyc2VkLlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtzdHJpbmd9IHNob3J0Y29kZVxyXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxyXG5cdCAqL1xyXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5pc1VucGFyc2VkU2hvcnRjb2RlID0gZnVuY3Rpb24oIHNob3J0Y29kZSApIHtcclxuXHRcdHZhciBhbHJlYWR5X2V4aXN0cyA9IGZhbHNlO1xyXG5cclxuXHRcdGZvciAoIHZhciBpID0gMDsgaSA8IHRoaXMucGFyc2VkU2hvcnRjb2Rlcy5sZW5ndGg7IGkrKyApIHtcclxuXHRcdFx0aWYgKCB0aGlzLnBhcnNlZFNob3J0Y29kZXNbIGkgXS5zaG9ydGNvZGUgPT09IHNob3J0Y29kZSApIHtcclxuXHRcdFx0XHRhbHJlYWR5X2V4aXN0cyA9IHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gYWxyZWFkeV9leGlzdHMgPT09IGZhbHNlO1xyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldHMgdGhlIHNob3J0Y29kZXMgZnJvbSBhIGdpdmVuIHBpZWNlIG9mIHRleHQuXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxyXG5cdCAqIEByZXR1cm5zIHthcnJheX0gVGhlIG1hdGNoZWQgc2hvcnRjb2Rlc1xyXG5cdCAqL1xyXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5nZXRTaG9ydGNvZGVzID0gZnVuY3Rpb24oIHRleHQgKSB7XHJcblx0XHRpZiAoIHR5cGVvZiB0ZXh0ICE9PSBcInN0cmluZ1wiICkge1xyXG5cdFx0XHQvKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoIFwiRmFpbGVkIHRvIGdldCBzaG9ydGNvZGVzLiBFeHBlY3RlZCBwYXJhbWV0ZXIgdG8gYmUgYSBzdHJpbmcsIGluc3RlYWQgcmVjZWl2ZWRcIiArIHR5cGVvZiB0ZXh0ICk7XHJcblx0XHRcdC8qIGpzaGludCBpZ25vcmU6ZW5kKi9cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBjYXB0dXJlcyA9IHRoaXMubWF0Y2hDYXB0dXJpbmdTaG9ydGNvZGVzKCB0ZXh0ICk7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHRoZSBjYXB0dXJpbmcgc2hvcnRjb2RlcyBmcm9tIHRoZSB0ZXh0IGJlZm9yZSB0cnlpbmcgdG8gbWF0Y2ggdGhlIGNhcHR1cmluZyBzaG9ydGNvZGVzLlxyXG5cdFx0Zm9yICggdmFyIGkgPSAwOyBpIDwgY2FwdHVyZXMubGVuZ3RoOyBpKysgKSB7XHJcblx0XHRcdHRleHQgPSB0ZXh0LnJlcGxhY2UoIGNhcHR1cmVzWyBpIF0sIFwiXCIgKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbm9uQ2FwdHVyZXMgPSB0aGlzLm1hdGNoTm9uQ2FwdHVyaW5nU2hvcnRjb2RlcyggdGV4dCApO1xyXG5cclxuXHRcdHJldHVybiBjYXB0dXJlcy5jb25jYXQoIG5vbkNhcHR1cmVzICk7XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogTWF0Y2hlcyB0aGUgY2FwdHVyaW5nIHNob3J0Y29kZXMgZnJvbSBhIGdpdmVuIHBpZWNlIG9mIHRleHQuXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxyXG5cdCAqIEByZXR1cm5zIHtBcnJheX1cclxuXHQgKi9cclxuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUubWF0Y2hDYXB0dXJpbmdTaG9ydGNvZGVzID0gZnVuY3Rpb24oIHRleHQgKSB7XHJcblx0XHR2YXIgY2FwdHVyZXMgPSBbXTtcclxuXHJcblx0XHQvLyBGaXJzdCBpZGVudGlmeSB3aGljaCB0YWdzIGFyZSBiZWluZyB1c2VkIGluIGEgY2FwdHVyaW5nIHNob3J0Y29kZSBieSBsb29raW5nIGZvciBjbG9zaW5nIHRhZ3MuXHJcblx0XHR2YXIgY2FwdHVyZUtleXdvcmRzID0gKCB0ZXh0Lm1hdGNoKCB0aGlzLmNsb3NpbmdUYWdSZWdleCApIHx8IFtdICkuam9pbiggXCIgXCIgKS5tYXRjaCggdGhpcy5rZXl3b3JkUmVnZXggKSB8fCBbXTtcclxuXHJcblx0XHQvLyBGZXRjaCB0aGUgY2FwdHVyaW5nIHNob3J0Y29kZXMgYW5kIHN0cmlwIHRoZW0gZnJvbSB0aGUgdGV4dCBzbyB3ZSBjYW4gZWFzaWx5IG1hdGNoIHRoZSBub24gY2FwdHVyaW5nIHNob3J0Y29kZXMuXHJcblx0XHRmb3IgKCB2YXIgaSA9IDA7IGkgPCBjYXB0dXJlS2V5d29yZHMubGVuZ3RoOyBpKysgKSB7XHJcblx0XHRcdHZhciBjYXB0dXJlS2V5d29yZCA9IGNhcHR1cmVLZXl3b3Jkc1sgaSBdO1xyXG5cdFx0XHR2YXIgY2FwdHVyZVJlZ2V4ID0gXCJcXFxcW1wiICsgY2FwdHVyZUtleXdvcmQgKyBcIlteXFxcXF1dKj9cXFxcXS4qP1xcXFxbXFxcXC9cIiArIGNhcHR1cmVLZXl3b3JkICsgXCJcXFxcXVwiO1xyXG5cdFx0XHR2YXIgbWF0Y2hlcyA9IHRleHQubWF0Y2goIG5ldyBSZWdFeHAoIGNhcHR1cmVSZWdleCwgXCJnXCIgKSApIHx8IFtdO1xyXG5cclxuXHRcdFx0Y2FwdHVyZXMgPSBjYXB0dXJlcy5jb25jYXQoIG1hdGNoZXMgKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gY2FwdHVyZXM7XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogTWF0Y2hlcyB0aGUgbm9uIGNhcHR1cmluZyBzaG9ydGNvZGVzIGZyb20gYSBnaXZlbiBwaWVjZSBvZiB0ZXh0LlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHRcclxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XHJcblx0ICovXHJcblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLm1hdGNoTm9uQ2FwdHVyaW5nU2hvcnRjb2RlcyA9IGZ1bmN0aW9uKCB0ZXh0ICkge1xyXG5cdFx0cmV0dXJuIHRleHQubWF0Y2goIHRoaXMubm9uQ2FwdHVyZVJlZ2V4ICkgfHwgW107XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2VzIHRoZSB1bnBhcnNlZCBzaG9ydGNvZGVzIHRocm91Z2ggQUpBWCBhbmQgY2xlYXJzIHRoZW0uXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge0FycmF5fSBzaG9ydGNvZGVzIHNob3J0Y29kZXMgdG8gYmUgcGFyc2VkLlxyXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBpbiB0aGUgY29udGV4dCBvZiB0aGUgQUpBWCBjYWxsYmFjay5cclxuXHQgKlxyXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxyXG5cdCAqL1xyXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5wYXJzZVNob3J0Y29kZXMgPSBmdW5jdGlvbiggc2hvcnRjb2RlcywgY2FsbGJhY2sgKSB7XHJcblx0XHRpZiAoIHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiICkge1xyXG5cdFx0XHQvKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoIFwiRmFpbGVkIHRvIHBhcnNlIHNob3J0Y29kZXMuIEV4cGVjdGVkIHBhcmFtZXRlciB0byBiZSBhIGZ1bmN0aW9uLCBpbnN0ZWFkIHJlY2VpdmVkIFwiICsgdHlwZW9mIGNhbGxiYWNrICk7XHJcblx0XHRcdC8qIGpzaGludCBpZ25vcmU6ZW5kICovXHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIHR5cGVvZiBzaG9ydGNvZGVzID09PSBcIm9iamVjdFwiICYmIHNob3J0Y29kZXMubGVuZ3RoID4gMCApIHtcclxuXHRcdFx0alF1ZXJ5LnBvc3QoIGFqYXh1cmwsIHtcclxuXHRcdFx0XHRhY3Rpb246IFwid3BzZW9fZmlsdGVyX3Nob3J0Y29kZXNcIixcclxuXHRcdFx0XHRfd3Bub25jZTogd3BzZW9TaG9ydGNvZGVQbHVnaW5MMTBuLndwc2VvX2ZpbHRlcl9zaG9ydGNvZGVzX25vbmNlLFxyXG5cdFx0XHRcdGRhdGE6IHNob3J0Y29kZXMsXHJcblx0XHRcdH0sXHJcblx0XHRcdFx0ZnVuY3Rpb24oIHNob3J0Y29kZVJlc3VsdHMgKSB7XHJcblx0XHRcdFx0XHR0aGlzLnNhdmVQYXJzZWRTaG9ydGNvZGVzKCBzaG9ydGNvZGVSZXN1bHRzLCBjYWxsYmFjayApO1xyXG5cdFx0XHRcdH0uYmluZCggdGhpcyApXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogU2F2ZXMgdGhlIHNob3J0Y29kZXMgdGhhdCB3ZXJlIHBhcnNlZCB3aXRoIEFKQVggdG8gYHRoaXMucGFyc2VkU2hvcnRjb2Rlc2BcclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7QXJyYXl9IHNob3J0Y29kZVJlc3VsdHNcclxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xyXG5cdCAqXHJcblx0ICogQHJldHVybnMge3ZvaWR9XHJcblx0ICovXHJcblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLnNhdmVQYXJzZWRTaG9ydGNvZGVzID0gZnVuY3Rpb24oIHNob3J0Y29kZVJlc3VsdHMsIGNhbGxiYWNrICkge1xyXG5cdFx0c2hvcnRjb2RlUmVzdWx0cyA9IEpTT04ucGFyc2UoIHNob3J0Y29kZVJlc3VsdHMgKTtcclxuXHRcdGZvciAoIHZhciBpID0gMDsgaSA8IHNob3J0Y29kZVJlc3VsdHMubGVuZ3RoOyBpKysgKSB7XHJcblx0XHRcdHRoaXMucGFyc2VkU2hvcnRjb2Rlcy5wdXNoKCBzaG9ydGNvZGVSZXN1bHRzWyBpIF0gKTtcclxuXHRcdH1cclxuXHJcblx0XHRjYWxsYmFjaygpO1xyXG5cdH07XHJcblxyXG5cdHdpbmRvdy5Zb2FzdFNob3J0Y29kZVBsdWdpbiA9IFlvYXN0U2hvcnRjb2RlUGx1Z2luO1xyXG59KCkgKTtcclxuIl19