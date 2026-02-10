var JSplump = new pdfwheel.JSplump({
	'tips_language': tips_language,
	'PDFViewerApplication': PDFViewerApplication,
})

var pdfHighlight = new pdfwheel.Highlight({
	'tips_language': tips_language,
	'PDFViewerApplication': PDFViewerApplication,
})

var pdfAnnotation = new pdfwheel.Annotation({
	'tips_language': tips_language,
	'PDFViewerApplication': PDFViewerApplication,
})

var pdfAnnotationUI = new pdfwheel.UI({
	'tips_language': tips_language,
	'PDFViewerApplication': PDFViewerApplication,
})


var interval=null;
function loadDetect() {
	interval = setInterval('loadPdf()', 1000);
}
function loadPdf() {
	if (PDFViewerApplication.pdfDocument == null) {
		// console.info('Loading...');
	} else {
		clearInterval(interval);
		console.info("页数",PDFViewerApplication.pagesCount);
	}
}

pdfAnnotationUI.initControls();
// main function, load html and listen   主函数
window.onload = function() {
	//debugger;
	// var all_href = location.href;
	// var file_id = all_href.split('?')[1];
	// var pdfUrl = file_id.split('=')[1];
	var pdfUrl = location.href.split('?')[1].split('=')[1].split('content')[0] //+ "content";
	
   var pdfUrl1 = pdfUrl.replace('&beforePrint', '');
	//var pdfUrl = location.href;
	console.log('pdfUrl',pdfUrl1);
	window.PDFViewerApplication.open(pdfUrl1); //open pdf 打开pdf文档
	//监听加载是否完成
	loadDetect();
	pdfAnnotationUI.addPinchListener(); // Listen gesture zoom 监听手势缩放

	setAnnotationButtons(); //add annotation buttons 添加批注功能按钮
	setColorControl(); //Add color control panel 添加颜色控制面板
	setSingleOperater(); //add operation buttons after selection  增加选中后的操作按钮
	// testSetAllMemberList(); //set member 设置用户

	pdf_viewer = document.getElementById('viewer');
	pdf_viewer.addEventListener("mouseup", function(event) {
		listenHighlight();
	}, true);

	//listen selectionchange 监听选区变化
	// document.addEventListener("selectionchange", function(event) {
	// 	pdfHighlight.selectionAct();
	// }, true);

	//remove listen 监听删除
	document.addEventListener("keydown", function(event) {
		if (event.shiftKey) {
			shiftKeyPressed = true;
			// console.log('Shift键被按下');
		}

		if (event.key === "Delete") {
			pdfAnnotation.delEl();
		};
		// console.log('event',event);

		if (event.ctrlKey && event.keyCode === 90) {
			// Your code here to handle the "ctrl+z" key combination
			// console.log("ctrl+z pressed");
			pdfAnnotation.undoAnnotation();
		};
		if (event.ctrlKey && event.keyCode === 89) {
			// Your code here to handle the "ctrl+z" key combination
			// console.log("ctrl+z pressed");
			pdfAnnotation.redoAnnotation();
		}
	});

	document.addEventListener('keyup', function(event) {
		if (!event.shiftKey) {
			shiftKeyPressed = false;
			// console.log('Shift键被释放');
		}
	});

	// pdf_viewer.addEventListener("dblclick", function(event) {
	// 	// console.log('双击了页面');
	// 	if (current_click_type!='select'){
	// 		// console.log(event);
	// 		var this_canvas = getCurrentClickCanvas(event);
	// 		initialFabricState(this_canvas);//清空添加状态
	// 	}
	// 	event.preventDefault();
	// }, true);


	// console.log('域名',document.domain);
	var that = this;
	//listen file choosing and open 监听文件选择
	var this_e = document.getElementById('choose_file');
	this_e.addEventListener('change', function(e) {
		setFileAnnotation(this_e, e);
		this_e.value = null;
	});

	var inputElement = document.getElementById("image_insert");
	// console.log('加载图片');
	inputElement.addEventListener('change', function(ev) {
		// console.log('插入图片');
		onlaodImgToInsert(ev);
		inputElement.value = null;
	});

	//ban mouse right click 禁止在菜单上的默认右键事件
	var my_menu = document.getElementById('my-menu');
	my_menu.oncontextmenu = function(e) {
		e.preventDefault()
	}

	//listen color and opacity change 监听颜色变化和透明度变化
	pdfAnnotation.observeValue('fill');
	pdfAnnotation.observeValue('stroke');
	pdfAnnotation.observeValue('backgroundColor');
	pdfAnnotation.observeNumeric('opacity');
	pdfAnnotation.observeNumeric('strokeWidth');

	// //默认打开列表
	// if (default_show_annotation_list==true){
	// 	editAnnotation();
	// 	// console.log('打开列表');
	// 	pdfAnnotationUI.show_all_annotation_list=true;
	// 	pdfAnnotationUI.showAnnotationList();
	// 	// // //刷新批注显示列表
	// 	// if (pdfAnnotationUI.show_annotation_list) {
	// 	// }
	// }
	//历史框可标注
	listenDrag("my_annotation_history");
}

window.onresize = function() { //监听屏幕的改变
	setTimeout(function() {
		JSplump.refreshConnections();
	}, 100)
};



function listenDrag(id) {
	// 获取需要拖动的元素
	var annotationElement = document.getElementById(id);
	// 添加鼠标事件处理程序
	annotationElement.addEventListener("mousedown", dragStart);
	annotationElement.addEventListener("mousemove", drag);
	annotationElement.addEventListener("mouseup", dragEnd);


	// 当拖动开始时触发的函数
	function dragStart(event) {
		// 存储鼠标按下时的坐标和元素的初始位置
		// event.preventDefault(); // 阻止默认的拖动行为
		annotationElement.startX = event.clientX;
		annotationElement.startY = event.clientY;
		annotationElement.initialX = annotationElement.offsetLeft;
		annotationElement.initialY = annotationElement.offsetTop;

		// 添加样式以指示元素正在被拖动
		annotationElement.classList.add("dragging");
	}

	// 当拖动过程中触发的函数
	function drag(event) {
		if (annotationElement.startX === undefined || annotationElement.startY === undefined) {
			return;
		}

		// 计算鼠标移动的距离
		var offsetX = event.clientX - annotationElement.startX;
		var offsetY = event.clientY - annotationElement.startY;

		// 计算元素的新位置
		var newX = annotationElement.initialX + offsetX;
		var newY = annotationElement.initialY + offsetY;

		// 应用新的位置
		annotationElement.style.left = newX + "px";
		annotationElement.style.top = newY + "px";
	}

	// 当拖动结束时触发的函数
	function dragEnd(event) {
		// 清除存储的坐标和初始位置
		annotationElement.startX = undefined;
		annotationElement.startY = undefined;
		annotationElement.initialX = undefined;
		annotationElement.initialY = undefined;

		// 移除拖动样式
		annotationElement.classList.remove("dragging");
	}
}
