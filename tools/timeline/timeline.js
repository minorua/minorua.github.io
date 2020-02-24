var settings;
var initialVisibleRecords = 50;
var storage_prefix = 'tl_';
var storageList = new localStorageList(storage_prefix);
var editting_index = null;
var textUpdated = false;
var callbackUploadFinished = null;

var isSettingPage = false;
var geo_position=null;
var statusTimer=null;

var uploadList = [];
var numUploaded, numUploadError;
// var progressBar;

var ready=false;
var query;	// for debug

function onLoad() {
	/// 設定の読込
	var str = localStorage['settings'];
	if(str == null) {
		$('#timeline').text('設定ページで初期設定を行なってください。');
		return;
	}
	settings = JSON.parse(str);

	$('.title').html('<a href="./">'+settings.pageTitle+'</a>');

	var numRecords = storageList.count();
	var numTw = 0;
	for(i = 0; i < numRecords; i++) {
		var row = storageList.get(i);
		if(row.status > 0 && row.imported == 0) numTw++;
	}

	// initialize input box
	init_inputbox();
	window.location.hash.substring(1).split('&').forEach(function (param) {
		var p = param.split('=');
		if (p[0] == 't') $('#inputbox').val(decodeURIComponent(p[1]));
	});

	// update list
	update_timeline();
	// updateLocation();

	if(numTw > 50) {
		if(confirm('アップロードされていないメモが50件以上あります. 同期しますか?')) sync();
	}
}

function onRButton() {
  if (uploadList.length > 0) {
    // previous uploading has not finished
    status('現在アップロード中です');
    return;
  }

	callbackUploadFinished = function () {
		$('#progress_parent').hide();
		status('');
		update_timeline();
	};

  upload_records();
}

function conceal() {
	var header_height = $('.header').height();
	$('#blind').css('top',header_height+'px');
	$('#blind').css('width',$(document).width()+'px');
	$('#blind').css('height',($(document).height()-header_height)+'px');

	$('.rbutton').text('表示');
	$('#blind').fadeIn();
}

function remove_blind() {
	$('.rbutton').text('隠す');
	$('#blind').css('display','none');
}

function on_keydown() {
	if(event.keyCode==13) {
		if(event.ctrlKey || event.shiftKey) {
			if($('#blind').css('display')=='none') conceal();
			else remove_blind();
			return false;
		}
		else {
			if($('#logbutton').attr('disabled')!='disabled') enter();
			return false;
		}
	}
	else if(event.ctrlKey || event.shiftKey) {
		if(event.keyCode == 8 || event.keyCode == 38 || event.keyCode == 40) {
			if(editting_index == null && $('#inputbox').val() != '') return true;
			if(textUpdated && !confirm('変更が破棄されます。フォーカスを移動しますか?')) return true;

			inc = (event.keyCode==38)?1:-1;
			itemCount = storageList.count();
			if(editting_index == null) editting_index = itemCount;

			for(i = editting_index + inc; 0 <= i && i < itemCount; i += inc) {
				data = storageList.get(i);
				if(data.status != 0) return edit_record(i);
			}
			
			location.reload();
			return false;
		}

	}

	return true;
}

function on_keypress() {
	textUpdated = true;
	
	// TODO 日本語入力ではkeypressイベントが発生しない。
}

function update_timeline() {
	$('#timeline').html('');
	var index = storageList.count() - 1, num_listitem = 0;
	while(index >= 0) {
		var row = storageList.get(index);
		if(row.status != 0) {
			var editstr = '';
      if (row.imported==0) {
        editstr = '<a href="#" class="edit">変更</a> | <a href="#" class="remove">削除</a>';
      }

			var stts = '';
			if(row.status>1) stts+='<span class="star">☆</span>';
			if(row.exported!=0) stts+='<span class="status">[exported]</span>';
			if(row.imported!=0) stts+='<span class="status">[online]</span>';

			$('#timeline').append('<li id="li'+index+'"><input type="checkbox" class="check" name="check" value="'+index+'">'+row.ts+' <span class="itemtext">'+row.text+'</span> '+editstr+stts+'</li>');
			num_listitem++;
			if(initialVisibleRecords == num_listitem) break;
		}
		index--;
	}

	$('a.edit').click(function() {
		return edit_record($(this).parent().attr('id').substr(2));
	});

  $('a.remove').click(function() {
    var listitem = $(this).parent();
    if(confirm('"' + $('.itemtext', listitem).text() + '"を削除してもよろしいですか?')) {
      remove_record(listitem.attr('id').substr(2));
      update_timeline();
    }
    return false;
  });

	$('#timeline .itemtext').dblclick(onItemFocused);

	ready = true;
	$('#logbutton').removeAttr('disabled');

	itemCount = storageList.count();
	recordcount = itemCount+' 件のメモ';
	if(initialVisibleRecords>0 && itemCount > initialVisibleRecords) {
		$('#timeline').append('<li style="text-align:center;cursor:pointer;background-color:#CCCCFF;" onclick="initialVisibleRecords=0; update_timeline()">すべて表示</li>');
		recordcount += ' ('+initialVisibleRecords+'件を表示)';
	}
	$('#recordcount').html(recordcount);
}

function onItemFocused() {
	var listitem = $(this).parent();
	idx = listitem.attr('id').substr(2);
	item = storageList.get(idx);
	if(item.exported != 0 || item.imported != 0) return;

	edit_record(idx);
}

function init_inputbox() {
	editting_index = null;
	textUpdated = false;
	$('#inputbox').val('');
	$('#boxlabel').html('いまどうしてる？');
	$('#time').html('');
	$('#time').css('display','none');
	$('#logbutton').val('記録');
	status('');

	$('#inputbox').focus();
}

function enter() {
	if(ready==false) return;

	var ts=$('#time').html();
	var text=$('#inputbox').val();

	if(geo_position!=null) {
		if($('#geoloc').attr('checked')) text+=' #LOC:N'+geo_position.coords.latitude+',E'+geo_position.coords.longitude;
	}
	if(text=='') return;

	ready=false;
	$('#logbutton').attr('disabled','disabled');

	if(editting_index===null) {
		data = {ts:now(),text:text,status:1,exported:0,imported:0};
		storageList.add(data);
	}
	else {
		data = storageList.get(editting_index);
		data.text = text;
		storageList.set(editting_index,data);
	}

	init_inputbox();
	update_timeline();

  // 同期中にメモされた場合にダウンロードによって投稿したメモが削除されるので
  // メモのダウンロードが行われないようにする。
  callbackUploadFinished = null;

	if(settings.AutoUpload) {
    if (uploadList.length > 0) return;    // previous uploading has not finished

    callbackUploadFinished = function () {
      $('#progress_parent').hide();
      status('');
      update_timeline();
    };

    upload_records(settings.UploadMinPassedSec);
  }
	return false;
}

function edit_record(idx) {
	$('#timeline .focused').removeClass('focused');

	editting_index = idx;
	textUpdated = false;
	item = storageList.get(idx);

	$('#li'+idx).addClass('focused');
	$('#boxlabel').html('メモ変更中です...');
	$('#time').html(item.ts);
	$('#time').css('display','block')
	$('#inputbox').val(item.text);
	$('#logbutton').val('変更');
	$('#inputbox').focus();
	return false;
}

function start_edit_last_record() {
	for(var i = storageList.count() - 1; i >= 0; i--) {
		data = storageList.get(i);
		if(data.status != 0) return edit_record(i);
	}
}

function select_allitems() {
	var boxes=document.listform.check;
	if(boxes.length==undefined) {
		boxes.checked=true;
	}
	else if(boxes.length>0) {
		for(i=0;i<boxes.length;i++) {
			boxes[i].checked=true;
		}
	}
}

function remove_selections() {
	var i,ts,boxes=document.listform.check;

	$("input[type='checkbox']:checked").each(function() {
		remove_record($(this).val());
	});

	init_inputbox();
	update_timeline();
}

function remove_record(index) {
	storageList.remove(index);
}

// synchronize
function sync() {
	close_menu();
	callbackUploadFinished = download_records;
	upload_records();
}

function str2date(str) {
	var a = str.split(/[- :]/);
	return new Date(a[0], a[1]-1, a[2], a[3], a[4], a[5]);
}

function upload_records(minimum_passed_time) {
	minimum_passed_time = minimum_passed_time || 0;
	var now = new Date();

	uploadList = [];
	numUploaded = numUploadError= 0;

	var itemCount = storageList.count();
	for(var i = 0; i < itemCount; i++) {
		var data = storageList.get(i);
		if(data.status != 0 && data.exported == 0 && data.imported == 0) {
      if ((now - str2date(data.ts)) / 1000 >= minimum_passed_time) uploadList.push({index:i, ts:data.ts, text:data.text});
    }
	}

	var numUpload = uploadList.length;

	if (numUpload == 0) {
		status('アップロードされていないメモはありません.');
		if(callbackUploadFinished) callbackUploadFinished();
    return;
	}

	status(numUpload + '件の未アップロードメモをアップロードしています.');

	$('#progress_parent').show();
	//progressBar = new html5jp.progress('progress', {full: numUpload, animation: 0});
	//progressBar.draw();

	var httpObj = new XMLHttpRequest();
	httpObj.onreadystatechange = function() {
    if(httpObj.readyState==4 && httpObj.status==200) {
      try {
        var res = JSON.parse(httpObj.responseText);
        if (res['code'] === 0) {
          for(var i = 0; i < uploadList.length; i++) {
            var index = uploadList[i].index,
                data = storageList.get(index);
            data.exported = 1;
            storageList.set(index, data);
          }

          status(res['message']);
          if(callbackUploadFinished) callbackUploadFinished();
        }
        else {
          // if not succeeded, try uploading one by one
          status(res['message'] + ' - 1件ずつアップロードします.');
          upload_onebyone();
        }
      } catch(e) {
        console.log(httpObj.responseText);
        alert(e);
      }
    }
  }

  httpObj.open('post', 'cmd.php', true);
  httpObj.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=UTF-8");
  var data = 'action=add&jsondata='+encodeURIComponent(JSON.stringify(uploadList));
  httpObj.send(data);

/*  $.ajax({
    type: 'POST',
    url: 'cmd.php',
    data: JSON.stringify({
      action: "add",
      jsondata: uploadList
    }),
    contentType: 'application/json',
    dataType: 'json',
    success: function(result) {
      alert(result.message);
    }
  });*/
}

function upload_onebyone() {
	upload_next();
}

function upload_next() {
	if(uploadList.length>0) {
		var row = uploadList.shift();
		pmemo(row.ts,row.text,row.index);
	}
}

function pmemo(ts,text,index) {
	//if(twpcheck()==false) return;
	var data='action=add&ts='+ts+'&text='+encodeURIComponent(text)+'&terminal=16';
	var httpObj = new XMLHttpRequest();
	if(httpObj) {
		httpObj.onreadystatechange = function() {
			if(httpObj.readyState==4 && httpObj.status==200) {
				if(httpObj.responseText.substr(0,2)=='ok') {
					data = storageList.get(index);
					data.exported = 1;
					storageList.set(index,data);

					numUploaded++;
					//progressBar.set_val(numUploaded);
					if(uploadList.length == 0 && numUploadError == 0) {
						if(callbackUploadFinished) callbackUploadFinished();
					}
				}
				else {
					status('ERROR:'+httpObj.responseText);
					numUploadError++;
				}
				upload_next();
			}
		}
		httpObj.open('post','cmd.php',true);
		httpObj.setRequestHeader("Content-Type","application/x-www-form-urlencoded;charset=UTF-8");
		httpObj.send(data);
	}
}

function download_records() {
	var p = ['action=get', 'format=json'];

	var type = [];
	if(settings.SyncType.memo) type.push(1);
	if(settings.SyncType.link) type.push(2);
	if(type.length > 0) p.push('type=' + type.join(','));

	if(settings.SyncRecentDay) p.push('recent=' + settings.SyncRecentDay);
	if(settings.SyncStar) p.push('star');

	var param = p.join('&');
	var i,lines,field;

  var msg = $('#status').text();
  if (msg) msg = ' (' + msg + ')';
  status('ダウンロード中です.' + msg);

	var httpObj = new XMLHttpRequest();
	httpObj.onreadystatechange = function() {
		if(httpObj.readyState==4 && httpObj.status==200) {
			storageList.clear();

			try {
				data = JSON.parse(httpObj.responseText);
				status(data.length+'件のメモをダウンロードしました.');

				for(i = 0; i < data.length; i++) {
					storageList.add(data[i]);
				}

				if(data.length == 0) status('ダウンロードされたメモはありません.');
				else status('同期が完了しました.');
			} catch(e) {
				console.log(httpObj.responseText);
				alert(e);
			}

			$('#progress').html('');
			$('#progress_parent').hide();
			update_timeline();
		}
	}
	httpObj.open('get','cmd.php?'+param,true);
	httpObj.send(null);
}


// common functions
function popup_menu() {
	$('#popupmenu').css('display','block');
	$('#popupmenu').css('top',$('.header').height()+'px');
}

function close_menu() {
	$('#popupmenu').css('display','none');
}

function status(msg, isHtml) {
	var statusdiv = $('#status');
	if(statusTimer != null) {
		clearTimeout(statusTimer);
		statusTimer = null;
	}

	if(msg == '') {
		statusdiv.hide();
    statusdiv.text('');
	}
	else {
    if (isHtml) statusdiv.html(msg);
    else statusdiv.text(msg);
		statusdiv.show();

		// timeout付メッセージ
		if(arguments.length==2) {
			timeout = arguments[1];
			statusTimer = setTimeout(function() {
				statusdiv.hide();
				statusdiv.text('');
			}, timeout);
		}
	}
}

function now() {
	Now=new Date();
	year=Now.getFullYear();
	month=Now.getMonth()+1;
	day=Now.getDate();
	hour=Now.getHours();
	minute=Now.getMinutes();
	second=Now.getSeconds();
	
	if(month<10) month='0'+month;
	if(day<10) day='0'+day;
	if(hour<10) hour='0'+hour;
	if(minute<10) minute='0'+minute;
	if(second<10) second='0'+second;
	
	return year+'-'+month+'-'+day+' '+hour+':'+minute+':'+second;
}

function getHttpRequestData(type,url,data) {
	var res;
	$.ajax({
		type: type,
		async: false,		// 同期通信
		url: url,
		data: data,
		success: function (response) {
			res = response;
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			console.log('Error: getHttpRequestData');
		}
	});
	return res;
}

function updateLocation() {
	geo_position=null;
	$('#td_geo').html('');
	navigator.geolocation.getCurrentPosition(function(position) {
		$('#td_geo').html('<input type="checkbox" name="geoloc" id="geoloc"><span id="geoloctext">位置情報を付加する. N:'+position.coords.latitude+' E:'+position.coords.longitude+'</span> <a href="#" onclick="updateLocation();return FALSE;">位置の更新</a>');
		geo_position=position;
	},function(err) {
		$('#td_geo').html('<div style="font-size:xx-small;color:lightgray;" align="left">位置情報が取得できません.('+err.message+')</div>');
	},{maximumAge:5000});
}


// stop watch - http://jsdo.it/kikuchy/6tH0
var tid = null;
var sec = 0;

function stopwatch_button1() {
	if(tid) stopwatch_stop();
	else stopwatch_start();
}

function stopwatch_button2(){
	sec = 0;
	document.getElementById("disp").innerHTML = sec;
}

function stopwatch_start(){
	// initialize
	var button = document.getElementById("sw_button1");

	tid = setInterval(stopwatch_updateTimer, 20);
	button.value = "STOP";
}

function stopwatch_updateTimer(){
	document.getElementById("disp").innerHTML = sec/50;
	sec++;
}

function stopwatch_stop(){
	clearInterval(tid);
	tid = null;
	var button = document.getElementById("sw_button1");
	button.value = "START";
}

// 3 minutes timer
var tid2 = null;

function timer_button1() {
	if(tid2) timer_clear();
	else timer_start();
}

function timer_start() {
	document.getElementById("tm_button1").value = 'CANCEL';
	tid2 = setTimeout(timer_finish, 180000);
}

function timer_clear() {
	clearTimeout(tid2);
	tid2 = null;
	document.getElementById("tm_button1").value = 'START';
}

function timer_finish() {
	document.getElementById("tm_button1").value = 'START';
	alert('3分経過しました');
}
