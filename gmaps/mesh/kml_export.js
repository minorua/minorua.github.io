var kmlExportDir = "bischofia_vb";

var errorCallback_kmlExport = function(e) {
	alert("Error: " + e.code);
};

function exportKML(listOfMeshCode) {
	if(listOfMeshCode.length == 1) {
		kml_name = listOfMeshCode[0];
		filename = kml_name + ".kml";
	}
	else {
		filename = prompt("ファイル名を入力して下さい","mesh.kml");
		kml_name = filename;
	}
	kml_desc = "";

	var lines = buildKML(listOfMeshCode, kml_name, kml_desc);
	writeKML(lines, filename);
}

function buildKML(listOfMeshCode, kml_name, kml_desc) {
	// var blobBuilder = new WebKitBlobBuilder();
	// blobBuilder -> lines, append -> push

	var lines = [];
	lines.push('<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">\n');
	lines.push('<Document>\n\t<name>'+kml_name+'</name>\n\t<description>'+kml_desc+'</description>\n');
	lines.push('\t<Style id="mesh">\n\t\t<LineStyle>\n\t\t\t<color>ffff0000</color>\n\t\t\t<width>4</width>\n\t\t</LineStyle>\n\t\t<PolyStyle>\n\t\t\t<color>00ffffff</color>\n\t\t</PolyStyle>\n\t</Style>\n');

	// TODO メッシュ階層毎にグループ化，並べ替え
	for(var i = 0; i < listOfMeshCode.length; i++) {
		meshcode = listOfMeshCode[i];
		if(meshcode != "") {	// TODO meshcode check
			place_name = meshcode;
			place_desc = "meshcode: " + meshcode;

			lines.push('\t<Placemark>\n\t\t<name>'+place_name+'</name>\n\t\t<description>'+place_desc+'</description>\n');
			lines.push('\t\t<styleUrl>#mesh</styleUrl>\n');
			lines.push('\t\t<Polygon>\n\t\t\t<tessellate>1</tessellate>\n\t\t\t<outerBoundaryIs>\n\t\t\t\t<LinearRing>\n\t\t\t\t\t<coordinates>\n');
			lines.push('\t\t\t\t\t\t' + LatLngBounds2Polygon(meshcode2LatLngBounds(meshcode)) + '\n');
			lines.push('\t\t\t\t\t</coordinates>\n\t\t\t\t</LinearRing>\n\t\t\t</outerBoundaryIs>\n\t\t</Polygon>\n\t</Placemark>\n');
		}
	}

//	lines.push('\t<Folder>\n\t<name>1次メッシュ</name>\n\n');
//	lines.push('\n\t</Folder>\n');
//	lines.push('  <Point>\n    <coordinates>133.90757,34.696682</coordinates>\n  </Point>\n</Placemark>');

	lines.push('</Document>\n</kml>\n');
	return lines;
//	return blobBuilder.getBlob("text/plain");
}

function writeKML(lines, filename) {
	window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
	window.requestFileSystem(window.TEMPORARY, 1024*1024, function(fs) {
		fs.root.getDirectory(kmlExportDir, {create: true}, function(dirEntry) {
			fs.root.getFile(kmlExportDir + "/" + filename, {create: true}, function(fileEntry) {
				fileEntry.createWriter(function(fileWriter) {
					fileWriter.onwriteend = function() {
						location.href = fileEntry.toURL();
					};

					var blobBuilder = new WebKitBlobBuilder();
					for(var i = 0; i < lines.length; i++) {
						blobBuilder.append(lines[i]);
					}

					fileWriter.write(blobBuilder.getBlob("text/plain"));

	//				fileWriter.write(buildKML(listOfMeshCode, kml_name, kml_desc));
				}, errorCallback_kmlExport);
			}, errorCallback_kmlExport);
		}, errorCallback_kmlExport);
	}, errorCallback_kmlExport);
}

function listTemporaryFilesA(fs) {
	fs.root.getDirectory(kmlExportDir, null, function(dirEntry) {
		var dirReader = dirEntry.createReader();
		var filenames = [];
		var readEntries = function() {
			dirReader.readEntries (function(results) {
				if(!results.length) {
					alert(filenames.join("\n"));
				} else {
					for(var i = 0; i < results.length; i++) {
						filenames.push(results[i].name);
					}

					readEntries();
				}
			}, errorCallback_kmlExport);
		};
		readEntries();
	}, function(e) {
		if(e.code == FileError.NOT_FOUND_ERR) alert("一時ファイルはありません");
		else errorCallback_kmlExport(e);
	});
}

function countTemporaryFiles(callback) {
	window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
	window.requestFileSystem(window.TEMPORARY, 1024*1024, function(fs) {
		countTemporaryFilesA(fs, callback);
	}, errorCallback_kmlExport);
}

function countTemporaryFilesA(fs, callback) {
	fs.root.getDirectory(kmlExportDir, null, function(dirEntry) {
		var numFiles = 0;
		var dirReader = dirEntry.createReader();
		var readEntries = function() {
			dirReader.readEntries (function(results) {
				if(!results.length) {
					callback(numFiles);
				} else {
					numFiles += results.length;
					readEntries();
				}
			}, errorCallback_kmlExport);
		};
		readEntries();
	}, function(e) {
		if(e.code == FileError.NOT_FOUND_ERR) callback(0);
		else errorCallback_kmlExport(e);
	});
}

function removeTemporaryFiles(callback) {
	window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
	window.requestFileSystem(window.TEMPORARY, 1024*1024, function(fs) {
		countTemporaryFilesA(fs, function(numFiles) {
			if(numFiles) {
				fs.root.getDirectory(kmlExportDir, null, function(dirEntry) {
					dirEntry.removeRecursively(function() {
						callback(numFiles);
					}, errorCallback_kmlExport);
				}, errorCallback_kmlExport);
			}
			else {
				callback(numFiles);
			}
		});
	}, errorCallback_kmlExport);
}

function LatLngBounds2Polygon(bounds) {
	var a = bounds.toString().split("(").join("").split(")").join("").split(" ").join("").split(",");
	for(var i = 0; i < 4; i++) {
		dms = deg2dmsA(a[i]);
		a[i] = reviseDecimal((dms[0] + (dms[1] + dms[2] / 60) / 60).toString());
	}
//	if(debug_mode) console.log(bounds.toString() + "\n" + a.join("\n"));

	return [[a[1],a[0]].join(","),[a[1],a[2]].join(","),[a[3],a[2]].join(","),[a[3],a[0]].join(","),[a[1],a[0]].join(",")].join(" ");
}

function reviseDecimal(str) {
	var s = str.split(".");
	if(s.length != 2) return str;

	dp = s[1];
	lc = "";
	for(var i = 0; i < dp.length; i++) {
		c = dp.substr(i,1);
		if(c == lc) {
			renzoku++;
			if(renzoku == 6) {
				return s[0] + "." + dp.substr(0,i+1) + char_repeat(c,14-i);
			}
		}
		else {
			lc = c;
			renzoku = 1;
		}
	}
	return str;
}

// for IE
function char_repeat(c,n) {
	var str = "";
	for(var i = 0; i < n; i++) {
		str += c;
	}
	return str;
}

/*
function char_repeat(c,n) {
	var r = [];
	for(var i = 0; i < n; i++) {
		r.push(c);
	}
	return r.join('');
}
*/
