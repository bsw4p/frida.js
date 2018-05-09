/*
 * Copyright (c) 2018 Benedikt Schmotzle.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var requestHeaders  = "";
var requestBody     = "";
var responseHeaders = "";
var responseBody    = "";

function readHeaders(HeaderMap){
	var Keys   = HeaderMap.keySet().toArray();
	var Values = HeaderMap.values().toArray();
	var Result = "";

	for (var key in Keys) {
		if (Keys[key] && Keys[key] !== null && Values[key]) {
			Result += Keys[key] + ": " + Values[key].toString().replace(/\[/gi, "").replace(/\]/gi, "") + "\n";
		} else if (Values[key]) {
			Result += Values[key].toString().replace(/\[/gi, "").replace(/\]/gi, "") + "\n";
		}
	}

	return Result;
}

Java.perform(function() {
	try {
		var HttpURLConnection = Java.use("com.android.okhttp.internal.http.HttpURLConnectionImpl");
	} catch (e) {
		try {
			var HttpURLConnection = Java.use("com.android.okhttp.internal.huc.HttpURLConnectionImpl");
		} catch (e) { return }
	}

	var InputStreamReader = Java.use("java.io.InputStreamReader");
	var BufferedReader    = Java.use("java.io.BufferedReader");

	/*
	 * Hook inputstream and dump requests and responses
	 */
	HttpURLConnection.getInputStream.overloads[0].implementation = function() {
		try {
			responseHeaders = "";
			responseBody    = "";
			var Connection  = this;
			var stream      = this.getInputStream.overloads[0].apply(this, arguments);

			if (Connection.getHeaderFields) {
				responseHeaders = readHeaders(Connection.getHeaderFields());
			}

			if (stream) {
				var BufferedReaderStream = BufferedReader.$new(InputStreamReader.$new(stream));
				var inputLine = "";
				while ((inputLine = BufferedReaderStream.readLine()) != null){
					requestBody += inputLine + "\n";
				}
				BufferedReaderStream.close();
			}

			send("Request");
			send(Connection.getRequestMethod() + Connection.getURL().toString() + "\n" + requestHeaders + "\n" + requestBody + "\n\n");
			send("Response");
			send(responseHeaders + "\n" + responseBody + "\n\n");

			return stream;
		} catch (e) {
			this.getInputStream.overloads[0].apply(this, arguments);
		}
	}

	/*
	 * Hook outputstream and write everything to the requestHeaders variable
	 */
	HttpURLConnection.getOutputStream.overloads[0].implementation = function() {
		requestHeaders = "";
		requestBody    = "";
		var Connection = this;

		if (Connection.getRequestProperties) {
			requestHeaders = readHeaders(Connection.getRequestProperties());
		}

		return this.getOutputStream.overloads[0].apply(this, arguments);
	}
});
