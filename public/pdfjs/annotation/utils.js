function listenHighlight() {
	var highlight_data = pdfHighlight.getMouseUpPos(); //listen mouseup 监听鼠标抬起
}

function clickTab(node) {
	pdfAnnotationUI.clickTab(node);
}

function setFabricTop(node) {
	pdfAnnotationUI.setFabricTop(node);
}

function showAnnotationList() {
	pdfAnnotationUI.showAnnotationList();
}

function editAnnotation() {
	pdfAnnotationUI.show_annotation_list = !pdfAnnotationUI.show_annotation_list;
	if (pdfAnnotationUI.show_annotation_list) {
		document.getElementById('outerContainer').classList.add('myAnnotationSidebarOpen');
		pdfAnnotationUI.showAnnotationList();
	} else {
		document.getElementById('outerContainer').classList.remove('myAnnotationSidebarOpen');
		pdfAnnotationUI.hiddenAnnotationList();
		JSplump.draw_connect = false;
		JSplump.clearJsPlump();
	}
}

//open or close highlight and underline annotations list 展开或关闭高亮及下划线列表
function openOrCloseAnnotation(node) {
	pdfAnnotationUI.openOrCloseAnnotation(node);
}

function copyAnnotation(node) {
	pdfAnnotationUI.copyAnnotation(node);
}

function selectAnnotation(node) {
	pdfAnnotationUI.selectAnnotation(node);
}

function deleteAnnotation(node) {
	pdfAnnotation.deleteAnnotation(node);
	// console.log('刷新列表',pdfAnnotationUI.show_annotation_list);
	// if (pdfAnnotationUI.show_annotation_list==true){
	// 	pdfAnnotationUI.showAnnotationList();
	// }
}

//输入可保存的批注对象
function outputAnnotations() {
	var this_data = pdfAnnotation.outputAnnotations();
	var content = JSON.stringify(this_data['file_annotation']);
	var blob = new Blob([content], {
		type: "application/json;charset=utf-8"
	});
	saveAs(blob, this_data['file_name'] + ".json");
}

function clearPageAnnotations(node) {
	pdfAnnotation.clearPageAnnotations(node);
}

function openAnnotationFile() {
	var this_e = document.getElementById('choose_file');
	this_e.click();
}

function setFileAnnotation(this_e, e) {
	var file = e.currentTarget.files[0];
	if (file) {
		if (file.type != 'application/json') {
			alert('only support the file outputed by this application');
			return;
		}

		const reader = new FileReader();
		reader.readAsText(file);
		reader.onload = () => {
			if (file.type == 'application/json') {
				var old_file_obj = pdfAnnotation.readFileAnnotations();
				var json_data = JSON.parse(reader.result);
				pdfAnnotation.setFileAnnotation(json_data);
				//刷新文件保存之后更新历史记录
				pdfAnnotation.saveDataAfterClearFile(old_file_obj);
			}
		}
		reader.onerror = (e) => {
			alert('error:', e)
		}
	}
	this_e.value = '';
}

//载入批注 reload annotations
function setPureFileAnnotation(anno_contents) {
	var old_file_obj = pdfAnnotation.readFileAnnotations();
	var json_data = JSON.parse(reader.result);
	pdfAnnotation.setFileAnnotation(json_data);
	//刷新文件保存之后更新历史记录
	pdfAnnotation.saveDataAfterClearFile(old_file_obj);
}

function clearFileAnnotations() {
	pdfAnnotation.clearFileAnnotations();
}

function downloadAnnotations() {
	var tips = {
		'zh-cn': [
			'[页码 ',
			'添加批注',
			'添加评论',
		],
		'en': [
			'[page ',
			'add comments',
			'comment',
		]
	} [tips_language];
	var this_data = pdfAnnotation.outputAnnotations();
	var this_file_annotations = this_data['file_annotation'];

	var down_str = '';
	for (var key in this_file_annotations) {
		var i = key.split('-')[3];
		var this_page_anno = this_file_annotations[key]['page_annotations'];

		if (this_page_anno.length > 0) {
			down_str += tips[0] + i + ']\r\n';
			for (var j = 0; j < this_page_anno.length; j++) {
				var this_anno = this_page_anno[j];
				if (this_anno['comment'] != tips[1] && this_anno['comment'] != tips[2]) {
					down_str += this_anno['all_str'] + '\r\n' + this_anno['comment'] + '\r\n\n';
				} else {
					down_str += this_anno['all_str'] + '\r\n\n';
				}
			}
			down_str += '\r\n';
		}
	}

	var blob = new Blob([down_str]);
	saveAs(blob, this_data['file_name'] + ".txt");
}

// download pdf 下载pdf
function myDownLoad() {
	PDFViewerApplication.downloadOrSave();
}

function undoAnnotation() {
	pdfAnnotation.undoAnnotation();
}

function redoAnnotation() {
	pdfAnnotation.redoAnnotation();
}

//click to input color 点击后输入颜色
function clickColorInput(node) {
	var this_input = node.getElementsByTagName('input')[0];
	this_input.click();
}

function delEl() {
	pdfAnnotation.delEl();
}

function hiddenMenu() {
	pdfAnnotation.hiddenMenu();
}

function fabricDraw(node) {
	pdfAnnotationUI.fabricDraw(node);
}

function fabricDraw1(node) {
	pdfAnnotationUI.fabricDraw1(node);
}

function eraserTool(node) {
	if (pdfAnnotation.eraser_brush == false) {
		pdfAnnotation.eraser_brush = true;
		pdfAnnotationUI.fabricDraw(null);
	} else {
		pdfAnnotation.eraser_brush = false;
		pdfAnnotation.free_draw = true;
		pdfAnnotationUI.fabricDraw(null);
	}
	// console.log('橡皮擦');
}

function chooseImage() {
	var inputElement = document.getElementById("image_insert");
	inputElement.click();
	// pdfAnnotation.chooseImage();
}

function addFabricObj(node, option) {
	pdfAnnotation.addFabricObj(node, option);
}

//按照矩形区域截图
function screenShotEl() {
	pdfAnnotation.screenShotEl();
}

// function inputComment(evt, node) {
// 	pdfAnnotation.inputComment(evt, node);
// }

function saveComment(node) {
	var comment_id=node.getAttribute('comment_id');
	// console.log('comment_id',comment_id);
	pdfAnnotation.saveComment(comment_id);
}

function closeCopyConfirm() {
	pdfHighlight.closeCopyConfirm();
}

function singleCopy() {
	var this_text = window.getSelection().toString();
	if (post_to_parent == true) {
		window.parent.postMessage({
			"type": 4,
			"source": "pdfjs",
			"content": text
		}, '*');
	} else {
		pdfAnnotationUI.copyText(this_text);
	}
	pdfHighlight.closeCopyConfirm();
}

function singleHighlightAndUnderline(op) {
	pdfHighlight.singleHighlightAndUnderline(op);
}

function openOrCloseLink(node) {
	pdfAnnotationUI.openOrCloseLink(node);
}

function activateAnnotation(e, node) {
	// console.log('激活批注',node);
	// pdfAnnotation.activateAnnotationByID(node);
	pdfAnnotation.activateAnnotation(e, node);
}

function cancelLightParent(this_node) {
	// var parent_node=this_node.parentElement;
	// console.log('父级元素',parent_node);
	// parent_node.style.backgroundColor='red';
	var id_split = this_node.id.split('-');
	var page_number = id_split[1];
	var anno_id = id_split[3];
	var this_link_id = "page-" + page_number + "-anno-" + anno_id + "-container-link";
	var this_link_e = document.getElementById(this_link_id);
	this_link_e.classList.remove('link-annotation-item');
	// console.log('id列表',id_split);
}

function lightParent(this_node) {
	// var parent_node=this_node.parentElement;
	// console.log('父级元素',parent_node);
	// parent_node.style.backgroundColor='red';
	var id_split = this_node.id.split('-');
	var page_number = id_split[1];
	var anno_id = id_split[3];
	var this_link_id = "page-" + page_number + "-anno-" + anno_id + "-container-link";
	var this_link_e = document.getElementById(this_link_id);
	this_link_e.classList.add('link-annotation-item');
	// console.log('id列表',id_split);
}


function closeAnnotationHistory() {
	pdfAnnotation.closeAnnotationHistory();
}

function showThisPageLink(node) {
	if (pdfAnnotationUI.draw_connect == true) {
		var node_id = node.getAttribute('id');
		var id_split = node_id.split('-');
		this.PDFViewerApplication.page = parseInt(id_split[1]);
		setTimeout(() => {
			JSplump.draw_connect = true;
			// console.log('显示页码');
			JSplump.connectAllAnnotations(node_id); //绘制批注连接线

			//绘制批注链接线时记录id，后面刷新时自动重新链接
			last_connect_id = node_id;
		}, 1000);
	}
}

function onlaodImgToInsert(ev) {
	// console.log('加载图片');
	const file = ev.target.files[0];
	var blobURL;
	try {
		blobURL = URL.createObjectURL(file);
	} catch {
		return;
	}
	const img = new Image();
	img.setAttribute('crossOrigin', 'Anonymous');
	img.src = blobURL;
	img.onerror = function() {
		URL.revokeObjectURL(this.src);
		alert(tips[0]);
	};
	img.onload = function() {
		const MAX_WIDTH = 500;
		const MAX_HEIGHT = 500;
		const MIME_TYPE = 'image/png';
		const QUALITY = 1;

		URL.revokeObjectURL(this.src);
		const [newWidth, newHeight] = pdfAnnotation.calculateSize(
			img,
			MAX_WIDTH,
			MAX_HEIGHT
		);
		const canvas = document.createElement('canvas');
		canvas.width = newWidth;
		canvas.height = newHeight;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0, newWidth, newHeight);
		//销毁图片
		image = null;

		var new_image = new Image();
		// The value is set to anonymous, indicating that CORS requests for this element will not set credential flags. You cannot export a canvas or an object on a canvas as a picture without setting it.
		//值设置为 anonymous，表示对此元素的 CORS 请求将不设置凭据标志。若不设置，无法将画布或画布上的对象导出为图片。
		new_image.setAttribute('crossOrigin', 'Anonymous');
		// console.log('加载文件');
		new_image.onload = function() {
			//插入图片对象
			pdfAnnotation.insertImage(new_image);
			new_image=null;//销毁图片
		}
		var img_data = canvas.toDataURL('image/png');
		new_image.src = img_data;
	}
}

function setCurrentMemberId(this_member) {
	// this_member = {
	// 	'id': 'user_1',
	// 	'name': 'member_1',
	// };
	pdfHighlight.current_member=this_member;
	pdfAnnotation.current_member=this_member;
	pdfAnnotationUI.current_member=this_member;
}
