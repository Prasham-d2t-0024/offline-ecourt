var post_to_parent = false;
var shiftKeyPressed = false;
// tips_language决定了操作提示语
// var tips_language = 'zh-cn';
var tips_language = 'en';
var first_load = true;
var default_show_annotation_list = true; //控制右侧列表是否默认显示
var last_connect_id = '-1';

var show_state={}; //是否默认显示页面的批注列表

var show_my_menu=false; //显示颜色控制面板
var changed_number_value=false; //修改颜色面板的内容
var onload_record_history=true; //加载时保存一次历史记录
var object_modified=false; //对象是否被编辑

//是否默认显示批注
var hidden_open = '';
var hidden_close = '';
if (default_show_annotation_list == false) {
	hidden_open = "hidden='true'";
} else {
	hidden_close = "hidden='true'";
}

var default_show_onepage_annotation_list = true; //控制右侧列表每页批注是否默认展开
var hidden_container = '';
if (default_show_onepage_annotation_list == false) {
	hidden_container = "hidden='true'";
	hidden_open = "hidden='true'";
	hidden_close = "";
}else{
	hidden_close = "hidden='true'";
	hidden_open = "";
}

var defult_left = 0;
var defult_top = 0;
var left_top_offset = 30;

//下划线宽度和画笔宽度
var default_underline_width = 2;
var default_brush_width = 2.5;
var default_brush_width1 = 40;

//橡皮擦的默认大小
var default_eraser_brush_width=30;

//各类批注的的颜色
var default_fill_color = "rgba(17, 153,158,1)";
var default_brush_color = 'rgba(57, 181, 74,1)';
var default_brush_color1 = '#ffaa3385';
var default_brush_decimate = 0; //画笔拐角流畅度
var default_rect_fill_color = 'rgba(255, 237, 0,0.30)';
var default_screenshot_rect_fill_color = 'rgba(236, 240, 241,0.5)';
var default_screenshot_rect_background_color = "rgba(17, 153,158,1)";;
var default_screenshot_rect_text_color = 'rgba(255, 255, 255,1)';
var default_highlight_color = 'rgba(255, 237, 0,1)';
var default_underline_color = 'rgba(57, 181, 74,1)';
var defult_top = 0;
var defult_screen_shot_top = 30;

//default annotation object  默认批注对象
var default_text = {
	left: defult_left,
	top: defult_top,
	fill: default_fill_color,
	fontSize: 30,
	selectable: true,
	id: 'id',
};
var default_triangle = {
	width: 30,
	height: 40,
	fill: default_fill_color,
	left: 200 + left_top_offset,
	top: 0 + left_top_offset,
	angle: 90,
};

var default_line = {
	left: 0 + left_top_offset,
	top: 13 + left_top_offset,
	strokeWidth: 4,
	stroke: default_fill_color,
};

var default_rectangle = {
	left: defult_left,
	top: defult_top,
	width: 300,
	height: 300,
	fill: default_rect_fill_color,
	stroke: default_fill_color,
	strokeSize: 1,
	id: 'id',
};

// let line1 = new fabric.Line([lineleft, lineheight, lineleft,
// 0], { //终止位置，线长，起始位置，top，这里是从项目中截下来的我用了变量代替，你要用的话lineheight和lineleft用自己的变量或者数字代替。如果两个终止位置和起始位置的数值一样那么这个线条会垂直，这个应该很好理解。
// 	fill: '#5E2300', //填充颜色
// 	stroke: '#5E2300', //笔触颜色
// 	strokeWidth: 2, //笔触宽度
// 	hasControls: false, //选中时是否可以放大缩小
// 	hasRotatingPoint: false, //选中时是否可以旋转
// 	hasBorders: false, //选中时是否有边框
// 	transparentCorners: true,
// 	perPixelTargetFind: true, //默认false。当设置为true，对象的检测会以像互点为基础，而不是以边界的盒模型为基础。
// 	selectable: true, //是否可被选中
// 	lockMovementX: true, //X轴是否可被移动(true为不可，因为前缀是lock)
// 	lockMovementY: true, //Y轴是否可被移动(true为不可，因为前缀是lock)
// });

var default_straight_line = { //终止位置，线长，起始位置，top，这里是从项目中截下来的我用了变量代替，你要用的话lineheight和lineleft用自己的变量或者数字代替。如果两个终止位置和起始位置的数值一样那么这个线条会垂直，这个应该很好理解。
	fill: 'rgba(17, 153,158,1)', //填充颜色
	stroke: 'rgba(17, 153,158,1)', //笔触颜色
	strokeWidth: 3, //笔触宽度
	hasControls: true, //选中时是否可以放大缩小
	hasRotatingPoint: true, //选中时是否可以旋转
	hasBorders: true, //选中时是否有边框
	selectable: true, //是否可被选中
};

//截屏批注
var default_screenshot_text = {
	left: defult_left,
	top: defult_top,
	fill: default_screenshot_rect_text_color,
	backgroundColor: default_screenshot_rect_background_color,
	fontSize: 25,
	strokeWidth: 5,
	underline: true,
	selectable: true,
	id: 'id',
	lockRotation: true,
};

var default_screenshot_rectangle = {
	left: defult_left,
	top: defult_screen_shot_top,
	width: 300,
	height: 300,
	fill: default_screenshot_rect_fill_color,
	stroke: default_fill_color,
	lockRotation: true,
	strokeSize: 1,
	id: 'id',
	lockRotation: true,
};

var default_circle = {
	left: defult_left,
	top: defult_top,
	radius: 200,
	fill: default_rect_fill_color,
	stroke: default_fill_color,
	strokeSize: 1,
	id: 'id',
};

//create color control panel 创建颜色控制面板
function setColorControl() {
	var my_menu_node = document.getElementById('my-menu');
	my_menu_node.innerHTML = ''; //clear 清空所有子元素
	var buttons_text = {
		'zh-cn': [
			'<div title="关闭" onclick="hiddenMenu()"><label>关闭/close</label><i class="fa fa-times-circle" style="font-size: 15px;" aria-hidden="true"></i></div>',
			'<div onclick="clickColorInput(this)" title="点击色块修改颜色"><label>填充色</label><input type="color" id="fill"></div>',
			'<div onclick="clickColorInput(this)" title="点击色块修改颜色"><label>边框色</label><input type="color" id="stroke"></div>',
			'<div onclick="clickColorInput(this)" title="点击色块修改颜色"><label>背景色</label><input type="color" id="backgroundColor"></div>',
			'<div title="拖动进度条调整"><label style="margin-right: 20px;">边框粗细</label><input type="range" style="width: 80px;" id="strokeWidth" value="1" min="0" max="20" step="0.5"></div>',
			'<div title="拖动进度条调整"><label style="margin-right: 20px;">不透明度</label><input type="range" style="width: 80px;" id="opacity" value="100" min="1" max="100" step="1"></div>',
			'<div hidden=true id="ff-panel-screenshot" onclick="screenShotEl()" title="截取当前区域"><label>截图当前区域</label><i class="fa fa-camera" style="font-size: 15px;" aria-hidden="true"></i></div>',
			'<div onclick="delEl()" title="删除对象"><label>删除</label><i class="fa fa-trash" style="font-size: 15px;" aria-hidden="true"></i></div>',
		],
		'en': [

			'<div title="Close" onclick="hiddenMenu()"><label>Close</label><i class="fa fa-times-circle" style="font-size: 15px;" aria-hidden="true"></i></div>',
			'<div onclick="clickColorInput(this)" title="click to select color"><label>FillColor</label><input type="color" id="fill"></div>',
			'<div onclick="clickColorInput(this)" title="click to select color"><label>BorderColor</label><input type="color" id="stroke"></div>',
			'<div onclick="clickColorInput(this)" title="click to select color"><label>BackgroundColor</label><input type="color" id="backgroundColor"></div>',
			'<div title="select range"><label style="margin-right: 20px;">BorderSize</label><input type="range" style="width: 80px;" id="strokeWidth" value="1" min="0" max="20" step="0.5"></div>',
			'<div title="select range"><label style="margin-right: 20px;">Opacity</label><input type="range" style="width: 80px;" id="opacity" value="100" min="1" max="100" step="1"></div>',
			'<div hidden=true id="ff-panel-screenshot" onclick="screenShotEl()" title="shot current rect"><label>Shot Current Rect</label><i class="fa fa-camera" style="font-size: 15px;" aria-hidden="true"></i></div>',
			'<div onclick="delEl()" title="delete this object"><label>Delete</label><i class="fa fa-trash" style="font-size: 15px;" aria-hidden="true"></i></div>',
		]
	} [tips_language];

	for (var i = 0; i < buttons_text.length; i++) {
		var parent_button = document.createElement('div'); //add button 增加按钮
		var outer_html = buttons_text[i];
		parent_button.innerHTML = outer_html;
		my_menu_node.appendChild(parent_button.childNodes[0]);
	}
}

//选中文字后浮动菜单生成
function setHorAnnotationOperater() {
	var buttons_text = {
		'zh-cn': [
			'<button title="撤销最后一个批注" id="ff-hor-undo-btn" onclick="undoAnnotation()" type="button"><span style="margin-right: 5px;">撤销</span><i class="fa fa-undo" aria-hidden="true"></i></button>',
			'<button title="清空本人所有批注" id="ff-hor-clear-btn" onclick="clearFileAnnotations()" type="button"><span style="margin-right: 5px;">清空</span><i class="fa fa-trash" aria-hidden="true"></i></button>',
			'<button title="选中对象" id="ff-pointer-obj-btn" onclick="setFabricTop(this)" type="button"><span style="margin-right: 5px;">选中</span><i class="fa fa-mouse-pointer" aria-hidden="true"></i></button>',
			'<button title="提交后台保存批注" id="ff-save-upload-btn" onclick="outputAnnotations()" type="button"><span style="margin-right: 5px;">保存</span><i class="fa fa-upload" aria-hidden="true"></i></button>',
			'<button title="关闭批注栏" id="ff-close-hor-btn" onclick="closeHorAnnotationButtons(0)" type="button"><span style="margin-right: 5px;">关闭</span><i class="fa fa-window-close" aria-hidden="true"></i></button>',
		],
		'en': [
			'<button title="highlight selection text" id="ff-touch-highlight-btn" onclick="singleHighlightAndUnderline(0)" type="button"><span style="margin-right: 5px;">Highlight</span><i class="fa fa-paint-brush" aria-hidden="true"></i></button>',
			'<button title="underline selection text" id="ff-touch-underline-btn" onclick="singleHighlightAndUnderline(1)" type="button"><span style="margin-right: 5px;">Underline</span><i class="fa fa-underline" aria-hidden="true"></i></button>',
			'<button title="copy selection text" id="ff-touch-highlight-btn" onclick="singleCopy()" type="button"><span style="margin-right: 5px;">Copy</span><i class="fa fa-clipboard" aria-hidden="true"></i></button>',
			'<button title="cancel selection" onclick="closeCopyConfirm()" type="button"><span style="margin-right: 5px;">Cancel</span><i class="fa fa-window-close" aria-hidden="true"></i></button>',
		]
	} [tips_language];

	var single_buttons = document.getElementById('ff-hor-annotation-btn');
	single_buttons.innerHTML = ''; //clear 清空所有子元素

	for (var i = 0; i < buttons_text.length; i++) {
		var parent_button = document.createElement('button'); //add button 增加按钮
		var outer_html = buttons_text[i];
		parent_button.innerHTML = outer_html;
		single_buttons.appendChild(parent_button.childNodes[0]);

		if (i != buttons_text.length - 1) {
			var split_div = document.createElement('div');
			split_div.classList.add('vertical-split');
			single_buttons.appendChild(split_div);
		}
	}
}

//选中文字后浮动菜单生成
function setSingleOperater() {
	var buttons_text = {
		'zh-cn': [
			'<button title="高亮选中的文本" id="ff-touch-highlight-btn" onclick="singleHighlightAndUnderline(0)" type="button"><i class="fa fa-paint-brush" aria-hidden="true"></i></button>',
			'<button title="为选中的文本添加下划线" id="ff-touch-underline-btn" onclick="singleHighlightAndUnderline(1)" type="button"><i class="fa fa-underline" aria-hidden="true"></i></button>',
			'<button title="复制选中的文本" id="ff-touch-highlight-btn" onclick="singleCopy()" type="button"><i class="fa fa-clipboard" aria-hidden="true"></i></button>',
			'<button title="取消选择" onclick="closeCopyConfirm()" type="button"><i class="fa fa-window-close" aria-hidden="true"></i></button>',
		],
		'en': [
			'<button title="highlight selection text" id="ff-touch-highlight-btn" onclick="singleHighlightAndUnderline(0)" type="button"><i class="fa fa-paint-brush" aria-hidden="true"></i></button>',
			'<button title="underline selection text" id="ff-touch-underline-btn" onclick="singleHighlightAndUnderline(1)" type="button"><i class="fa fa-underline" aria-hidden="true"></i></button>',
			'<button title="copy selection text" id="ff-touch-highlight-btn" onclick="singleCopy()" type="button"><i class="fa fa-clipboard" aria-hidden="true"></i></button>',
			'<button title="cancel selection" onclick="closeCopyConfirm()" type="button"><i class="fa fa-window-close" aria-hidden="true"></i></button>',
		]
	} [tips_language];

	var single_buttons = document.getElementById('ff-copyconfirm-btn');
	single_buttons.innerHTML = ''; //clear 清空所有子元素

	for (var i = 0; i < buttons_text.length; i++) {
		var parent_button = document.createElement('button'); //add button 增加按钮
		var outer_html = buttons_text[i];
		parent_button.innerHTML = outer_html;
		single_buttons.appendChild(parent_button.childNodes[0]);

		if (i != buttons_text.length - 1) {
			var split_div = document.createElement('div');
			split_div.classList.add('vertical-split');
			single_buttons.appendChild(split_div);
		}
	}
}

// 顶部注释工具栏生成
function setAnnotationButtons() {
	// return;
	var annotation_buttons_node = document.getElementById('firefly-annotation-buttons');
	annotation_buttons_node.innerHTML = ''; //clear 清空所有子元素
	'<div class="splitToolbarButtonSeparator"></div>'
	var buttons_text = {
		'zh-cn': [
			'<div>',
			'<button title="下载批注后的文件(批注将标记在下载的文件中)" id="ff-download-btn" onclick="myDownLoad()" type="button"><i class="fa fa-folder" aria-hidden="true"><span></span></i></button>',
			'<button title="导出标注(json格式)" id="ff-output-btn" onclick="outputAnnotations()" type="button"><i class="fa fa-upload" aria-hidden="true"><span></span></i></button>',
			'<button title="导入标注(json格式)" id="ff-import-btn" onclick="openAnnotationFile()" type="button"><i class="fa fa-download" aria-hidden="true"><span></span></i></button>',
			'<button title="下载注释(txt格式)" id="ff-download-btn" onclick="downloadAnnotations()" type="button"><i class="fa fa-arrow-circle-down" aria-hidden="true"><span></span></i></button>',
			'<button title="切换至英文" id="ff-language-btn" onclick="setLanguage(1)" type="button"><i class="fa fa-etsy" aria-hidden="true"><span></span></i></button>',
			'</div>',
			'<div>',
			'<button title="选中对象" id="ff-pointer-obj" onclick="setFabricTop(this)" type="button"><i class="fa fa-mouse-pointer" aria-hidden="true"><span></span></i></button>',
			'<button title="编辑标注" id="ff-edit-btn" onclick="editAnnotation()" type="button"><i class="fa fa-list-ul" aria-hidden="true"><span></span></i></button>',
			'<button title="文本高亮(再次点击取消滑选标注)" id="ff-highlight-btn" onclick="clickTab(this)" type="button"><i class="fa fa-paint-brush" aria-hidden="true"><span></span></i></button>',
			'<button title="文本下划线(再次点击取消滑选标注)" id="ff-underline-btn" onclick="clickTab(this)" type="button"><i class="fa fa-underline" aria-hidden="true"><span></span></i></button>',
			'<button title="插入图片" id="ff-import-img" onclick="chooseImage()" type="button"><i class="fa fa-picture-o" aria-hidden="true"><span></span></i></button>',
			'<button title="页面截图" id="ff-screen-shot" onclick="addFabricObj(this,6)" type="button"><i class="fa fa-camera"></i></button>',
			'<button title="画笔工具" id="ff-free-draw" onclick="fabricDraw(this)" type="button"><i class="fa fa-pencil" aria-hidden="true"><span></span></i></button>',
			'<button title="文字工具" id="ff-add-text" onclick="addFabricObj(this,2)" type="button"><i class="fa fa-font" aria-hidden="true"><span></span></i></button>',
			'<button title="箭头工具" id="ff-add-arrow" onclick="addFabricObj(this,3)" type="button"><i class="fa fa-external-link-square" aria-hidden="true"><span></span></i></button>',
			'<button title="矩形工具" id="ff-add-rect" onclick="addFabricObj(this,4)" type="button"><i class="fa fa-window-maximize" aria-hidden="true"><span></span></i></button>',
			'<button title="圆形工具" id="ff-add-circle" onclick="addFabricObj(this,5)" type="button"><i class="fa fa-circle" aria-hidden="true"><span></span></i></button>',
			'<button title="直线工具" id="ff-add-line" onclick="addFabricObj(this,7)" type="button"><i class="fa fa-minus" aria-hidden="true"><span></span></i></button>',
			'</div>',
			'<div>',
			'<button title="橡皮檫" id="ff-eraser-btn" onclick="clickTab(this)" type="button"><i class="fa fa-eraser" aria-hidden="true"><span></span></i></button>',
			'<button title="撤销批注" id="ff-undo-btn" onclick="undoAnnotation()" type="button"><i class="fa fa-undo" aria-hidden="true"><span></span></i></button>',
			'<button title="重做批注" id="ff-redo-btn" onclick="redoAnnotation()" type="button"><i style="transform: rotateY(180deg);" class="fa fa-undo" aria-hidden="true"><span></span></i></button>',
			'<button title="清除本人所有批注" id="ff-clear-file-annotation-btn" onclick="clearFileAnnotations()" type="button"><i class="fa fa-trash" aria-hidden="true"><span></span></i></button>',
			'<button title="帮助文档" id="ff-undo-btn" onclick="openHelpDoc()" type="button"><i class="fa fa-question-circle" aria-hidden="true"><span></span></i></button>',
			'</div>',
		],
		'en': [
			'<div>',
			'<button title="select annotation object" id="ff-pointer-obj" onclick="setFabricTop(this)" type="button"><i class="fa fa-mouse-pointer" aria-hidden="true"><span></span></i></button>',
			'<button title="edit annotations" id="ff-edit-btn" onclick="editAnnotation()" type="button"><i class="fa fa-list-ul" aria-hidden="true"><span></span></i></button>',
			'<button title="highlight" id="ff-highlight-btn" onclick="clickTab(this)" type="button"><i class="fa fa-paint-brush" aria-hidden="true"><span></span></i></button>',
			'<button title="underline" id="ff-underline-btn" onclick="clickTab(this)" type="button"><i class="fa fa-underline" aria-hidden="true"><span></span></i></button>',
			'<button title="insert image" id="ff-import-img" onclick="chooseImage()" type="button"><i class="fa fa-picture-o" aria-hidden="true"><span></span></i></button>',
			'<button title="free draw" id="ff-free-draw" onclick="fabricDraw(this)" type="button"><i class="fa fa-pencil" aria-hidden="true"><span></span></i></button>',
			'<button title="add text" id="ff-add-text" onclick="addFabricObj(this,2)" type="button"><i class="fa fa-font" aria-hidden="true"><span></span></i></button>',
			'<button title="add arrow" id="ff-add-arrow" onclick="addFabricObj(this,3)" type="button"><i class="fa fa-external-link-square" aria-hidden="true"><span></span></i></button>',
			'<button title="add rectangle" id="ff-add-rect" onclick="addFabricObj(this,4)" type="button"><i class="fa fa-window-maximize" aria-hidden="true"><span></span></i></button>',
			'<button title="add circle" id="ff-add-circle" onclick="addFabricObj(this,5)" type="button"><i class="fa fa-circle" aria-hidden="true"><span></span></i></button>',
			'<button title="free draw highlight" id="ff-add-line" onclick="fabricDraw1(this)" type="button"><i class="fa fa-magic" aria-hidden="true"><span></span></i></button>',
			'</div>',
			'<div>',
			'<button title="undo annotation" id="ff-undo-btn" onclick="undoAnnotation()" type="button"><i class="fa fa-undo" aria-hidden="true"><span></span></i></button>',
			'<button title="redo annotation" id="ff-redo-btn" onclick="redoAnnotation()" type="button"><i style="transform: rotateY(180deg);" class="fa fa-undo" aria-hidden="true"><span></span></i></button>',
			'<button title="clear your all annotations" id="ff-clear-file-annotation-btn" onclick="clearFileAnnotations()" type="button"><i class="fa fa-trash" aria-hidden="true"><span></span></i></button>',
			'<button title="help" id="ff-undo-btn" onclick="openHelpDoc()" type="button"><i class="fa fa-question-circle" aria-hidden="true"><span></span></i></button>',
			'</div>',
		]
	} [tips_language];

	var new_html = '';
	for (var i = 0; i < buttons_text.length; i++) {
		new_html += buttons_text[i];
	}
	annotation_buttons_node.innerHTML = new_html;
}

//create help text and show   创建帮助文本并显示
function openHelpDoc() {
	var helps = {
		'zh-cn': [{
				'title': '下载文件',
				'detail': '下载批注后的文件，批注将标记在下载的文件中且不可撤销，如果需要编辑批注请打开未经本应用导入的文件',
			},
			{
				'title': '文本高亮',
				'detail': '高亮滑选的文本，对非黑色字体无效。',
			},
			{
				'title': '文本下划线',
				'detail': '给滑选的文本增加下划线，对非黑色字体无效。',
			},
			{
				'title': '注释列表',
				'detail': '打开注释列表并编辑（复制/删除/前往）',
			},
			{
				'title': '选中对象',
				'detail': '选中批注对象并修改',
			},
			{
				'title': '插入图片',
				'detail': '插入本地图片，会自动压缩图片',
			},
			{
				'title': '画笔工具',
				'detail': '在当前页面使用画笔工具自由绘制',
			},
			{
				'title': '文本框工具',
				'detail': '给当前页面添加可输入文本框',
			},
			{
				'title': '箭头工具',
				'detail': '给当前页面添加箭头',
			},
			{
				'title': '矩形工具',
				'detail': '给当前页面添加矩形框',
			},
			{
				'title': '圆形工具',
				'detail': '给当前页面添加圆',
			},
			{
				'title': '导出注释',
				'detail': '导出完整结构标注，用于给同名文件增加标注。',
			},
			{
				'title': '导入标注',
				'detail': '导入完整结构标注，用于给当前文件增加标注。',
			},
			{
				'title': '下载标注',
				'detail': '导出当前文件标注和评论为txt格式文档。',
			},
			{
				'title': '切换语言',
				'detail': '切换提示语言至英文',
			},
			{
				'title': '帮助文档',
				'detail': '打开帮助文档。',
			},
		],
		'en': [{
				'title': 'download',
				'detail': 'download pdf with annotations mark, it can not be undo, if you want to modify annotations, please open source file',
			}, {
				'title': 'highlight',
				'detail': 'highlight selected text, valid for only black text',
			},
			{
				'title': 'underline',
				'detail': 'underline selected text, valid for only black text',
			},
			{
				'title': 'annotation list',
				'detail': 'show annotation list and edit (copy/delete/gotp)',
			},
			{
				'title': 'select object',
				'detail': 'select annotation to modify',
			},
			{
				'title': 'insert image',
				'detail': 'insert image to current page and compress it',
			},
			{
				'title': 'free draw',
				'detail': 'free draw by brush in current page',
			},
			{
				'title': 'text input box',
				'detail': 'add text input box to current page',
			},
			{
				'title': 'arrow tool',
				'detail': 'add arrow to current page',
			},
			{
				'title': 'rectangle tool',
				'detail': 'add rectangle to current page',
			},
			{
				'title': 'circle tool',
				'detail': 'add circle to current page',
			},
			{
				'title': 'output annotations',
				'detail': 'output annotations for importing',
			},
			{
				'title': 'import annotations',
				'detail': 'import annotations for current file',
			},
			{
				'title': 'download annotations',
				'detail': 'download only annotations text and comments to txt',
			},
			{
				'title': 'help',
				'detail': 'open help file',
			},
		]
	} [tips_language];

	if (post_to_parent == true) {
		helps = [{
				'title': '下载文件',
				'detail': '下载批注后的文件，批注将标记在下载的文件中且不可撤销，如果需要编辑批注请打开未经本应用导入的文件',
			}, {
				'title': '文本高亮',
				'detail': '高亮滑选的文本，对非黑色字体无效。',
			},
			{
				'title': '文本下划线',
				'detail': '给滑选的文本增加下划线，对非黑色字体无效。',
			},
			{
				'title': '注释列表',
				'detail': '打开注释列表并编辑（复制/删除/前往）',
			},
			{
				'title': '选中对象',
				'detail': '选中批注对象并修改',
			},
			{
				'title': '插入图片',
				'detail': '插入本地图片，会自动压缩图片',
			},
			{
				'title': '画笔工具',
				'detail': '在当前页面使用画笔工具自由绘制',
			},
			{
				'title': '文本框工具',
				'detail': '给当前页面添加可输入文本框',
			},
			{
				'title': '箭头工具',
				'detail': '给当前页面添加箭头',
			},
			{
				'title': '矩形工具',
				'detail': '给当前页面添加矩形框',
			},
			{
				'title': '圆形工具',
				'detail': '给当前页面添加圆',
			},
			{
				'title': '导出注释',
				'detail': '导出完整结构标注，用于给同名文件增加标注。',
			},
			{
				'title': '导入标注',
				'detail': '导入完整结构标注，用于给当前文件增加标注。',
			},
			{
				'title': '云端保存',
				'detail': '将标注保存到云端，仅可用于云端文件。',
			},
			{
				'title': '加载云端标注',
				'detail': '用于云端标注未正确加载的情况。',
			},
			{
				'title': '下载标注',
				'detail': '导出当前文件标注和评论为txt格式文档。',
			},
			{
				'title': '帮助文档',
				'detail': '打开帮助文档。',
			},
		];
	}

	var help_str = {
		'zh-cn': '帮助文档:\n祝使用愉快\n\n按钮功能说明:\n',
		'en': 'help file for buttons introduction:\n',
	} [tips_language];

	var nums = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
	for (var i = 0; i < helps.length; i++) {
		var this_help = helps[i];
		help_str += nums[i] + ' ' + this_help['title'] + ' : ' + this_help['detail'] + '\n';
	}

	alert(help_str);
};

//listen tips_language change   监听tips language 的变化
function setLanguage(op) {
	if (op == 0) {
		tips_language = "zh-cn"
	} else {
		tips_language = "en"
	}
	setAnnotationButtons();
	setColorControl();
	setSingleOperater();
	// setHorAnnotationOperater(); //设置水平按钮
	//Listen again after switching languages 切换语言之后重新监听
	pdfAnnotation.observeValue('fill');
	pdfAnnotation.observeValue('stroke');
	pdfAnnotation.observeValue('backgroundColor');
	pdfAnnotation.observeNumeric('opacity');
	pdfAnnotation.observeNumeric('strokeWidth');
	if (pdfAnnotationUI.show_annotation_list) {
		pdfAnnotationUI.showAnnotationList();
	}
};

//防止手机端双击缩放和清空添加状态
function preventDoubleClick(event) {
	event.preventDefault();
};
