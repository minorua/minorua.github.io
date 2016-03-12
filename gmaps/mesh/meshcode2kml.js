var debug_mode = 0;
var userAgent = window.navigator.userAgent.toLowerCase();
var exportKML_enabled = (userAgent.indexOf("chrome")!=-1);

function init() {
	if(!exportKML_enabled) $("#exportKML").hide();
	var meshcode = location.search;
	if(meshcode != "") {
		$("#in_box").val(meshcode.substr(1));
		meshcode2kml(0);
	}

	countTemporaryFiles(function(numFiles) {
		if(numFiles) $("#removeTemp").show();
	});
}

function meshcode2kml(saveKML) {
	var meshList = $("#in_box").val().split("\n");
	var listOfMeshCode = [];
	for(var i = 0; i < meshList.length; i++) {
		if(meshList[i] != "") {
			if(!checkCode(meshList[i])) {
				alert((i+1) + "行目のメッシュコード(" + meshList[i] + ")が読み込めませんでした。");
				return false;
			}
			listOfMeshCode.push(meshList[i]);
		}
	}

	if(listOfMeshCode.length == 1) {
		kml_name = listOfMeshCode[0];
		filename = kml_name + ".kml";
	}
	else if(saveKML) {
		filename = prompt("ファイル名を入力して下さい","mesh.kml");
		if(!filename || filename == null) return;
		kml_name = filename;
	}
	else {
		kml_name = "mesh";
	}

	var lines = buildKML(listOfMeshCode, kml_name, "");
	if(saveKML) {
		writeKML(lines, filename);
		$("#removeTemp").show();
	}
	else {
		$("#out_box").val(lines.join(""));
	}
}

function removeTemp() {
	removeTemporaryFiles(function (numFiles) {
		if(numFiles) alert(numFiles + "個の一時ファイルを削除しました");
		else if(numFiles === 0) alert("一時ファイルはありません");

		$("#removeTemp").hide();
	});
}
