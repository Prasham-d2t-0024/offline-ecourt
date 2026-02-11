// pdfwheel.Annotation=window.jsnamespace.Annotation || {};
var pdfwheel = window.jsnamespace || {};
pdfwheel.Annotation = function (cfg) {
	cfg = cfg || {};
	this.tips_language = cfg["tips_language"] || "en";
	// this.tips_language = "en";
	this.PDFViewerApplication = cfg["PDFViewerApplication"] || null;
	this.custom_attr = ['id', 'hasControls', 'hasRotatingPoint', 'hasBorders', 'selectable', 'lockMovementX',
		'lockMovementY', 'opacity', 'crossOrigin', 'member_id', 'text', 'my_type', 'comment', 'backup_opacity',
		'lockRotation', '_controlsVisibility'
	];
	this.current_member = {
		'id': 'user_1',
		'name': 'member_1',
	};
	this.fabric_annos_id_tag = 'annos-for-page-';
	this.tmp_annotation_data = {};
	this.active_fabric_obj = {
		'page_number': null,
		'active_element': null,
	};
	this.add_water_mark = false;
	this.annotation_id = ''; //current annotaion id 当前批注id置空
	this.fabric_list = {};
	this.fabric_top = false;
	this.free_draw = false;
	this.show_annotation_list = false;
	this.set_annotation_layer_for_all_type = true; //hover event for every type annotation 为高亮之外的所有元素增加鼠标悬浮响应

	this.downPoint = null; //downPoint of mouse 鼠标按下的位置
	this.upPoint = null; //upPoint of mouse  鼠标抬起的位置
	this.current_click_type = 'select'; //点击的类型
	this.adding_item = null;
	this.adding_screen_shot_item = null;
	this.adding_screen_shot_text = null;
	this.current_mouse_text = 'mouse text';
	this.timer = null;

	this.previous_history = [];
	this.max_history_length = 11;
	this.history_index = 0;

	//是否启用橡皮擦
	this.eraser_brush = false;
};

//draw all pages annotations when refresh 刷新页面的绘制所有页面的批注
pdfwheel.Annotation.prototype.drawAllPageAnnotations = function () {
	// console.log('绘图模式',free_draw);
	var viewerConinter = document.getElementById('viewerContainer');
	var old_scroll_left = viewerConinter.scrollLeft;
	var old_scroll_top = viewerConinter.scrollTop;

	var canvas_wrappers = document.getElementsByClassName('canvasWrapper');
	for (var c = 0; c < canvas_wrappers.length; c++) {
		this.drawOnepageAnnotation(canvas_wrappers[c]);
		// addIdForTextLayerSpan(canvas_wrappers[c].parentNode);
	}

	//激活画笔
	// changeFabricDrawMode();

	viewerConinter.scrollLeft = old_scroll_left;
	viewerConinter.scrollTop = old_scroll_top;
	if (pdfAnnotationUI.show_annotation_list) {
		pdfAnnotationUI.showAnnotationList();
	}
}

pdfwheel.Annotation.prototype.selectcomment = function (node) {
	if (node.textContent.trim() === 'add comments') {
		// Clear the comment content
		node.textContent = "";
	}
}
function selectcomment(node) {
	if (node.textContent.trim() === 'add comments') {
		// Clear the comment content
		node.textContent = "";
	}
}

pdfwheel.Annotation.prototype.drawOnepageAnnotation = function (this_wrapper) {
	var page_number = this_wrapper.parentNode.getAttribute('data-page-number');
	var this_fabric_obj = this.getFabricObj(page_number);
	if (this_fabric_obj) {
		this.loadOldFabricObj(this_wrapper, this_fabric_obj);
	} else {
		this.drawAnnotationOnFabricPageFirstTime(this_wrapper, page_number);
	}
	// redraw annotationLayer for click and hover重新绘制顶部批注层
	var annotation_layer_id = "page-" + page_number + "-annotationLayer";
	var this_annotation_layer = document.getElementById(annotation_layer_id);
	if (this_annotation_layer) {
		this.clearAllAnnotationLayerItem(page_number);
		this.addFabricObjToAnnotationTextLayer(this_annotation_layer);
	}
};

//get all fabric layer objects  获取所有 Fabric 页面对象
pdfwheel.Annotation.prototype.getFabricObj = function (page_number) {
	var page_id = this.fabric_annos_id_tag + page_number.toString();
	return this.fabric_list[page_id];
}

pdfwheel.Annotation.prototype.redrawAnnotationLayer = function (opt) {
	try {
		var this_annotation_layer = opt.e.target.parentNode.parentNode.getElementsByClassName('annotationLayer')[0];
		// console.log('重新绘制注释层',opt.e.target.parentNode.parentNode);
		this.addFabricObjToAnnotationTextLayer(this_annotation_layer);
	} catch {
		return;
	}
}

// add annotation object to AnnotationTextLayer 将批注对象写入到注释图层中
pdfwheel.Annotation.prototype.addFabricObjToAnnotationTextLayer = function (this_annotation_layer) {
	var tips = {
		'zh-cn': [
			'点击查看批注信息',
		],
		'en': [
			'click to view annotation',
		]
	}[this.tips_language];

	// console.log('tips',tips);
	// console.log('this_annotation_layer',this_annotation_layer);
	var page_number = this_annotation_layer.parentNode.getAttribute('data-page-number');
	this_annotation_layer.setAttribute('id', 'page-' + page_number + '-annotationLayer'); //其他参数可以没有，但是id一定要有
	var old_fabric_obj = this.readFabricAnnotationsForPage(page_number);
	// console.log('绘制对象',old_fabric_obj);
	if (old_fabric_obj == null) {
		return;
	}

	var canvas = this_annotation_layer.parentNode.getElementsByClassName('canvasWrapper')[0].children[0];
	// console.log('old_fabric_obj',old_fabric_obj);
	var width = canvas.style.width;
	var height = canvas.style.height;
	this_annotation_layer.style.width = width;
	this_annotation_layer.style.height = height;
	this_annotation_layer.removeAttribute('hidden');

	var objects = old_fabric_obj.page_canvas.fabric_canvas_json.objects;
	//当前页面不存在批注对象时，则返回
	if (Object.keys(objects).length === 0) {
		// console.log('没有对象返回');
		return;
	}
	// console.log('旧对象',objects);
	var page_width = old_fabric_obj.page_canvas.width;
	var page_height = old_fabric_obj.page_canvas.height;
	var point_num = 4;
	for (let fabric_item of objects) {
		var final_objects = fabric_item;
		var group_item = false;
		// in case of "group" object 如果是组合对象，则分开渲染
		// console.log('fabric_item',fabric_item);
		if (fabric_item.objects && fabric_item.objects.length >= 1) {
			final_objects = fabric_item.objects;
			group_item = true;
		}

		this.addWholeErea(fabric_item, page_width, page_height, this_annotation_layer, page_number, tips);

		// tpm_div.classList.add('linkAnnotation');
		// tpm_div.classList.add('link-annotation-item');
		// tpm_div.innerHTML='<section style="linkAnnotation link-annotation-item">'
		if (fabric_item['my_type'] == 'highlight') {
			for (var i = 0; i < final_objects.length; i++) {
				var item = final_objects[i];
				if (group_item == true) {
					item['top'] = item.top + fabric_item.top + fabric_item.height / 2;
					item['left'] = item.left + fabric_item.left + fabric_item.width / 2;
				}

				var scaleX = item['scaleX'] || 1;
				var scaleY = item['scaleY'] || 1;
				var angle = item['angle'] || 0;
				var tmp_pos = {
					'left': (item.left / page_width * 100).toFixed(point_num) + '%',
					'top': (item.top / page_height * 100).toFixed(point_num) + '%',
					'width': (item.width * scaleX / page_width * 100).toFixed(point_num) + '%',
					'height': (item.height * scaleY / page_height * 100).toFixed(point_num) + '%',
					'rotate': 'rotate(' + angle + 'deg)',
				}

				var this_link_id = "page-" + page_number + "-anno-" + fabric_item.id + '-index-' + i.toString() +
					"-container-link";

				//删除旧的元素，添加新的
				var this_link_e = document.getElementById(this_link_id);
				// console.log(this_link_e);
				if (this_link_e) {
					// this_annotation_layer.remove(this_link_e);
					// update existed object position 如果是存在的则更新参数
					this_link_e.style.left = tmp_pos['left'];
					this_link_e.style.top = tmp_pos['top'];
					this_link_e.style.width = tmp_pos['width'];
					this_link_e.style.height = tmp_pos['height'];
					this_link_e.style.transform = tmp_pos['rotate'];
				} else {
					var tpm_div = document.createElement('div');
					tpm_div.innerHTML +=
						'<section title="' + tips[0] +
						'" onclick=activateAnnotation(event,this) custom_id="annotation" onmouseleave="cancelLightParent(this)" onmouseover="lightParent(this)" class="linkAnnotation" id="' +
						this_link_id +
						'" style="left:' + tmp_pos['left'] + ';top:' + tmp_pos['top'] +
						';width:' + tmp_pos['width'] + ';height:' + tmp_pos['height'] + ';transform:' + tmp_pos[
						'rotate'] +
						';z-index:0;">' +
						'</section>';
					this_annotation_layer.appendChild(tpm_div.children[0]);
					// '</section>';
					// console.log('临时div',tpm_div);
					// console.log('当前对象的位置',tmp_pos);
				}
			}
		}
		// tpm_div.innerHTML+='<a href="javascript:void(0);"></a></section>'
	}

	//绘制连接线
	pdfAnnotationUI.showLink();
}

pdfwheel.Annotation.prototype.addWholeErea = function (fabric_item, page_width, page_height, this_annotation_layer,
	page_number, tips) {
	//in the furture consider about rotate object 后面还要考虑旋转的对象
	var this_link_id = "page-" + page_number + "-anno-" + fabric_item.id + "-container-link";
	var scaleX = fabric_item['scaleX'] || 1;
	var scaleY = fabric_item['scaleY'] || 1;
	var angle = fabric_item['angle'] || 0;
	var tmp_pos = {
		'left': (fabric_item.left / page_width * 100).toFixed(point_num) + '%',
		'top': (fabric_item.top / page_height * 100).toFixed(point_num) + '%',
		'width': (fabric_item.width * scaleX / page_width * 100).toFixed(point_num) + '%',
		'height': (fabric_item.height * scaleY / page_height * 100).toFixed(point_num) + '%',
		'rotate': 'rotate(' + angle + 'deg)',
	}

	var tpm_div = document.createElement('div');
	var point_num = 4;
	var this_link_e = document.getElementById(this_link_id);
	// console.log(this_link_e);
	if (this_link_e) {
		// this_annotation_layer.remove(this_link_e);
		//如果是存在的则更新参数
		this_link_e.style.left = tmp_pos['left'];
		this_link_e.style.top = tmp_pos['top'];
		this_link_e.style.width = tmp_pos['width'];
		this_link_e.style.height = tmp_pos['height'];
		this_link_e.style.transform = tmp_pos['rotate'];
	} else {
		tpm_div.innerHTML =
			'<section title="' + tips[0] +
			'" custom_id="annotation" id="' +
			this_link_id +
			'" style="left:' + tmp_pos['left'] + ';top:' + tmp_pos['top'] +
			';width:' + tmp_pos['width'] + ';height:' + tmp_pos['height'] + ';transform:' + tmp_pos['rotate'] +
			';z-index:0;pointer-events: none;">' +
			'</section>';
		this_annotation_layer.appendChild(tpm_div.children[0]);
	}

	//非高亮对象的顶层事件
	if (this.set_annotation_layer_for_all_type == true && fabric_item['my_type'] != 'highlight') {
		var this_link_id = "page-" + page_number + "-anno-" + fabric_item.id + "-index-0-container-link";

		//删除旧的元素，添加新的
		var this_link_e = document.getElementById(this_link_id);
		// console.log(this_link_e);
		if (this_link_e) {
			// this_annotation_layer.remove(this_link_e);
			//如果是存在的则更新参数
			this_link_e.style.left = tmp_pos['left'];
			this_link_e.style.top = tmp_pos['top'];
			this_link_e.style.width = tmp_pos['width'];
			this_link_e.style.height = tmp_pos['height'];
			this_link_e.style.transform = tmp_pos['rotate'];
		} else {
			var tpm_div = document.createElement('div');
			tpm_div.innerHTML +=
				'<section title="' + tips[0] +
				'" onclick=activateAnnotation(event,this) custom_id="annotation" onmouseleave="cancelLightParent(this)" onmouseover="lightParent(this)" class="linkAnnotation" id="' +
				this_link_id +
				'" style="left:' + tmp_pos['left'] + ';top:' + tmp_pos['top'] +
				';width:' + tmp_pos['width'] + ';height:' + tmp_pos['height'] + ';transform:' + tmp_pos['rotate'] +
				';z-index:0;">' +
				'</section>';
			this_annotation_layer.appendChild(tpm_div.children[0]);
		}
	}

}

pdfwheel.Annotation.prototype.clearAllAnnotationLayerItem = function (page_number) {
	//删除元素
	var annotation_layer_id = "page-" + page_number + "-annotationLayer";
	var this_annotation_layer = document.getElementById(annotation_layer_id);
	if (this_annotation_layer) {
		// console.log('所有子节点', this_annotation_layer.childNodes);
		var children = this_annotation_layer.childNodes;
		var delete_ids = [];
		for (let child of children) {
			// console.log('child', child);
			if (child.getAttribute('custom_id') == 'annotation') {
				delete_ids.push(child.id);
			}
		}

		//先统计后删除
		for (let id of delete_ids) {
			var this_child = document.getElementById(id);
			this_annotation_layer.removeChild(this_child);
		}
	}
}


//load Fabric data 加载Fabric批注数据
pdfwheel.Annotation.prototype.loadOldFabricObj = function (this_wrapper, this_fabric_obj) {
	// 添加批注到批注层
	// this.addFabricObjToAnnotationTextLayer(this_wrapper, this_fabric_obj);
	var canvas_container = this_wrapper.parentNode.getElementsByClassName('canvas-container');
	if (canvas_container.length != 0) {
		this_wrapper.parentNode.removeChild(canvas_container[0]);
	}
	// console.log(this_fabric_obj);
	var canvas = this_wrapper.children[0];
	// console.log('this canvas',canvas);
	var width = parseInt(canvas.style.width.replace('px', ''));
	var height = parseInt(canvas.style.height.replace('px', ''));

	//将注释层的宽度也调整

	var my_annotation_layer = this_wrapper.parentNode.getElementsByClassName('annotationLayer')[0];
	if (my_annotation_layer) {
		my_annotation_layer.style.height = height + 'px';
		my_annotation_layer.style.width = width + 'px';
	}

	this_fabric_obj.page_canvas_container.style.width = width + 'px';
	this_fabric_obj.page_canvas_container.style.height = height + 'px';
	this_fabric_obj.page_canvas_container.style.position = 'absolute';

	this_fabric_obj.page_canvas_container.children[0].style.width = width + 'px';
	this_fabric_obj.page_canvas_container.children[0].style.height = height + 'px';

	this_fabric_obj.page_canvas_container.children[1].style.width = width + 'px';
	this_fabric_obj.page_canvas_container.children[1].style.height = height + 'px';

	if (this.fabric_top == true || this.free_draw == true) {
		this_fabric_obj.page_canvas_container.style.zIndex = 100;
	} else {
		this_fabric_obj.page_canvas_container.style.zIndex = 10;
	}

	this_wrapper.parentNode.insertBefore(this_fabric_obj.page_canvas_container, this_wrapper.parentNode.children[
		0]);
}

//draw annotation on Fabric layer 在 Fabric 层上绘制批注
pdfwheel.Annotation.prototype.drawOnFabric = function (this_annotation, this_fabric_canvas, this_wrapper) {
	var canvas = this_wrapper.children[0];
	var width = parseInt(this_fabric_canvas.width);
	var height = parseInt(this_fabric_canvas.height);

	var group_list = [];

	var all_rects = this_annotation.rects;
	var save_width = this_annotation.true_size[0];
	var save_height = this_annotation.true_size[1];

	var scale_x = width / save_width / this_annotation
		.save_scale_x;
	var scale_y = height / save_height / this_annotation
		.save_scale_y;

	var point_num = 3;
	for (var i = 0; i < all_rects.length; i++) {
		var scale_rect = all_rects[i];
		var box_left = scale_rect[0],
			box_top = scale_rect[1],
			box_width = scale_rect[2],
			box_height = scale_rect[3];

		if (box_left == null || box_top == null || box_width == null || box_height == null) {
			continue;
		}

		var new_left = parseFloat((box_left * save_width * scale_x)
			.toFixed(point_num));
		var new_top = parseFloat((box_top * save_height * scale_y).toFixed(
			point_num));
		var new_width = parseFloat((box_width * save_width * scale_x)
			.toFixed(point_num));
		var new_height = parseFloat((box_height * save_height * scale_y)
			.toFixed(point_num));

		if (this_annotation.type == 'highlight') {
			var rect = new fabric.Rect({
				top: new_top,
				left: new_left,
				width: new_width,
				height: new_height,
				fill: default_highlight_color,
			})
			group_list.push(rect);
			// this_fabric_canvas.renderAll();
		} else {
			var line = new fabric.Line(
				[
					new_left, new_top, //start position 起始点坐标
					new_width, new_top //end position 结束点坐标
				], {
				stroke: default_underline_color, //brush color 笔触颜色
				strokeWidth: default_underline_width, //brush width 笔触宽度
			}
			)
			// this_fabric_canvas.add(line);
			group_list.push(line);
		}
	}

	var this_opacity = 1;
	if (this_annotation.type == 'highlight') {
		this_opacity = 0.3;
	}

	var all_left = parseFloat((this_annotation.all_rect[0] * save_width * scale_x)
		.toFixed(point_num));
	var all_top = parseFloat((this_annotation.all_rect[1] * save_height * scale_y)
		.toFixed(point_num));
	var group = new fabric.Group(group_list, {
		id: this_annotation.id,
		text: this_annotation.all_str, //增加文字
		my_type: this_annotation.type,
		comment: this_annotation.comment,
		member_id: this.getRandomMemberID(),
		left: all_left,
		top: all_top,
		angle: 0,
		opacity: this_opacity,
		backup_opacity: this_opacity,
		// hasControls: false, //scale or not 选中时是否可以放大缩小
		hasRotatingPoint: false, //rotate or not 选中时是否可以旋转
		hasBorders: true, //border or not 选中时是否有边框
		selectable: true, //selectable or not 是否可被选中
		lockMovementX: true, //move in X or not X轴是否可被移动(true为不可，因为前缀是lock)
		lockMovementY: true, //move in Y or not Y轴是否可被移动(true为不可，因为前缀是lock)
	});
	//隐藏所有九个控制角
	group.setControlsVisibility({
		tl: false,
		tr: false,
		br: false,
		bl: false,
		ml: false,
		mt: false,
		mr: false,
		mb: false,
		mtr: false,
	})
	// console.log(group);
	this_fabric_canvas.add(group);
}

// draw annotation on Fabric layer first time 首次在 Fabric图层上绘制批注
pdfwheel.Annotation.prototype.drawAnnotationOnFabricPageFirstTime = function (this_wrapper, page_number) {
	// var anno_ctx = document.getElementById(page_id).getContext("2d"); //用于清空重复区域
	var canvas_container = this_wrapper.parentNode.getElementsByClassName('canvas-container');
	if (canvas_container.length != 0) {
		this_wrapper.parentNode.removeChild(canvas_container[0]);
	}

	var anno_canvas = document.createElement("canvas");
	var page_id = this.fabric_annos_id_tag + page_number;
	anno_canvas.setAttribute('id', page_id);
	this_wrapper.parentNode.insertBefore(anno_canvas, this_wrapper.parentNode.children[0]);

	//用于绘制连接线的图层
	// var annotation_layer=document.createElement('div');
	// annotation_layer.classList.add('myLinkLayer');
	// annotation_layer.setAttribute('id', 'page-'+page_number+'-link-layer');
	// this_wrapper.parentNode.appendChild(annotation_layer,this_wrapper.parentNode.children[0]);

	var old_fabric_obj = this.readFabricAnnotationsForPage(page_number);
	if (old_fabric_obj) {
		var width = parseFloat(old_fabric_obj.page_canvas.width);
		var height = parseFloat(old_fabric_obj.page_canvas.height);
	} else {
		var canvas = this_wrapper.children[0];
		var width = parseInt(canvas.style.width.replace('px', ''));
		var height = parseInt(canvas.style.height.replace('px', ''));
	}

	// //设置连线层的长宽
	// annotation_layer.style.width = width + 'px';
	// annotation_layer.style.height = height + 'px';

	anno_canvas.width = width;
	anno_canvas.height = height;
	anno_canvas.style.width = width + 'px';
	anno_canvas.style.height = height + 'px';
	anno_canvas.classList.add('anno-canvas');

	var this_fabric_canvas = new fabric.Canvas(page_id, {
		includeDefaultValues: false, // false表示仅保存简易信息
		isDrawingMode: this.free_draw, // 开启绘图模式 tru or false
		fireRightClick: true, // 启用右键，button的数字为3
		stopContextMenu: false, // 禁止默认右键菜单
		backgroundColor: 'rgba(255, 255, 255, 0)',
	});

	var this_fabric_canvas_container = this_wrapper.parentNode.children[0];
	this_fabric_canvas_container.style.position = 'absolute';
	if (this.fabric_top == true || this.free_draw == true) {
		this_fabric_canvas_container.style.zIndex = 100;
	} else {
		this_fabric_canvas_container.style.zIndex = 10;
	}

	this.changeOneCanvasSelectState(this_fabric_canvas); //是否可以选中

	this.bindFabricEvent(this_fabric_canvas);
	// this_fabric_canvas.on('mouse:up', this.fabricMouseUp);
	// this_fabric_canvas.on('mouse:down', this.fabricCanvasMouseDown);
	// this_fabric_canvas.on('mouse:dblclick', this.cancleAddFabricObj);
	// this_fabric_canvas.on('object:scaling', this.keepScreenShotTextScale);
	// this_fabric_canvas.on('object:moving', this.keepTextFollowScreenShot);
	// this_fabric_canvas.on('object:moving', keepInCanvas);

	if (this.eraser_brush == true) {
		var this_eraser_brush = new fabric.EraserBrush(this_fabric_canvas) // 使用橡皮擦画笔
		this_eraser_brush.width = default_eraser_brush_width; // 设置画笔粗细为 10
		this_fabric_canvas.freeDrawingBrush = this_eraser_brush;
	} else {
		var pencilBrush = new fabric.PencilBrush(this_fabric_canvas);
		pencilBrush.decimate = default_brush_decimate;
		pencilBrush.width = default_brush_width;
		pencilBrush.color = default_brush_color;
		pencilBrush.limitedToCanvasSize = true;
		this_fabric_canvas.freeDrawingBrush = pencilBrush;
	}


	if (old_fabric_obj) {
		var that = this;
		this_fabric_canvas.loadFromJSON(old_fabric_obj.page_canvas.fabric_canvas_json, function () {
			// console.log('fabric_list',that.fabric_list)
			that.fabric_list[page_id] = {
				'page_id': page_id,
				'page_canvas_container': this_fabric_canvas_container,
				'page_annotations': old_fabric_obj.page_annotations, //current annotation data 当前页面的批注内容
				'page_canvas': {
					'fabric_canvas': this_fabric_canvas,
					'width': width,
					'height': height,
					'fabric_canvas_json': this_fabric_canvas.toJSON(that.custom_attr),
				},
			};
			that.loadOldFabricObj(this_wrapper, that.fabric_list[page_id]);
			// that.saveFabricCanvas(page_number);
			// that.saveAllFabricData();
		});
	} else {
		var current_canvas_page_id = PDFViewerApplication.baseUrl + '_page_fabric_' + page_number;
		var annotations_json = this.readAnnotationsForPage(current_canvas_page_id);
		if (annotations_json != null && annotations_json.length > 0) {
			for (var j = 0; j < annotations_json.length; j++) {
				var this_annotation = annotations_json[j];
				this.drawOnFabric(this_annotation, this_fabric_canvas, this_wrapper);
			}
		}
		this.fabric_list[page_id] = {
			'page_id': page_id,
			'page_canvas_container': this_fabric_canvas_container,
			'page_annotations': annotations_json, //current annotation data 当前页面的批注内容
			'page_canvas': {
				'fabric_canvas': this_fabric_canvas,
				'width': width,
				'height': height,
				'fabric_canvas_json': this_fabric_canvas.toJSON(this.custom_attr),
			},
		};
		// this.saveFabricCanvas(page_number);
		// this.saveAllFabricData();
	}
}

pdfwheel.Annotation.prototype.bindFabricEvent = function (this_fabric_canvas) {
	var that = this;
	this_fabric_canvas.on('mouse:up', function (opt) {
		that.fabricMouseUp(opt); //用这样的方式绑定才能保证作用域是当前的类而不是自动变成fabric 画布
	});
	this_fabric_canvas.on('mouse:down', function (opt) {
		that.fabricCanvasMouseDown(opt);
	});
	this_fabric_canvas.on('mouse:dblclick', function (opt) {
		that.cancleAddFabricObj(opt);
	});
	// this_fabric_canvas.on('object:scaling', function(opt) {
	// 	that.keepScreenShotTextScale(opt);
	// });

	// 监听路径创建
	this_fabric_canvas.on('path:created', (e) => {
		that.afterPathCreated(e, this_fabric_canvas);
	});

	// 监听对象增加
	// this_fabric_canvas.on('object:added', (e) => {
	// 	console.log('对象被添加');
	// 	that.canvasModified(e,this_fabric_canvas);
	// });

	// 监听对象编辑（移动、缩放、旋转）
	this_fabric_canvas.on('object:modified', (e) => {
		// console.log('对象被移动、旋转或者缩放',e);
		that.canvasModified(e, this_fabric_canvas);
	});

	// 监听对象移除
	// this_fabric_canvas.on('object:removed', (e) => {
	// 	console.log('对象被移除');
	// 	that.canvasModified(e,this_fabric_canvas);
	// });

	// 监听文字退出编辑，也就是编辑结束之后，实际上文字编辑之后肯定会改变对象的长度，触发'object:modified'，所以不需再用文字的监听
	// this_fabric_canvas.on('text:editing:exited', (e) => {
	// 	console.log('文字被编辑');
	// 	that.canvasModified(e,this_fabric_canvas);
	// });

	// // 监听对象移动
	// this_fabric_canvas.on('object:moving', (e) => {
	// 	console.log('对象被移动');
	// 	that.canvasModified(e,this_fabric_canvas);
	// });

	// // 监听对象旋转
	// this_fabric_canvas.on('object:rotating', (e) => {
	// 	console.log('对象被旋转');
	// 	that.canvasModified(e,this_fabric_canvas);
	// });

	// // 监听对象缩放
	// this_fabric_canvas.on('object:scaling', (e) => {
	// 	console.log('对象被缩放');
	// 	that.canvasModified(e,this_fabric_canvas);
	// });
}

pdfwheel.Annotation.prototype.canvasModified = function (ev, fabric_canvas) {
	// var fabric_canvas = ev.target.canvas;
	let canvasBoundaries = fabric_canvas.calcViewportBoundaries();
	let obj = ev.target;
	let objBoundingRect = obj.getBoundingRect();
	// console.log('当前对象位置',objBoundingRect);
	if (objBoundingRect.left < canvasBoundaries.tl.x) {
		ev.target.left = canvasBoundaries.tl.x;
	}

	if (objBoundingRect.left + objBoundingRect.width > canvasBoundaries.br.x) {
		ev.target.left = canvasBoundaries.br.x - objBoundingRect.width
	}

	if (objBoundingRect.top < canvasBoundaries.tl.y) {
		ev.target.top = canvasBoundaries.tl.y
	}

	if (objBoundingRect.top + objBoundingRect.height > canvasBoundaries.br.y) {
		ev.target.top = canvasBoundaries.br.y - objBoundingRect.height
	}

	fabric_canvas.renderAll();
	//确保附属对象也在画布内
	this.keepTextFollowScreenShot(ev);
	// console.log('对象被编辑',e);
	this.saveOnePageByCanvas(fabric_canvas);
}


//save all Fabric layers data 保存所有 Fabric 页面数据
pdfwheel.Annotation.prototype.saveAllFabricData = function () {
	// console.log('this.fabric_list',this.fabric_list);
	for (var key in this.fabric_list) {
		var page_number = key.split('-')[3];
		this.saveFabricCanvas(page_number);
	}
	// console.log('保存文件');
	// //刷新批注显示列表
	if (pdfAnnotationUI.show_annotation_list) {
		pdfAnnotationUI.showAnnotationList();
	}
}

pdfwheel.Annotation.prototype.setViewer = function (old_viewer) {
	var this_viewer = this.shotViewer();
	if (JSON.stringify(this_viewer) !== JSON.stringify(old_viewer)) {
		var viewer_container = document.getElementById('viewerContainer');
		PDFViewerApplication.pdfViewer.currentScaleValue = old_viewer['scale'];
		PDFViewerApplication.page = old_viewer['page'];
		viewer_container.scrollTop = old_viewer['scroll_top'];
		viewer_container.scrollLeft = old_viewer['scroll_left'];
	}
}

pdfwheel.Annotation.prototype.shotViewer = function () {
	var viewer_container = document.getElementById('viewerContainer');
	var this_viewer = {
		'page': this.PDFViewerApplication.page,
		'scale': this.PDFViewerApplication.pdfViewer.currentScaleValue,
		'scroll_top': viewer_container.scrollTop,
		'scroll_left': viewer_container.scrollLeft,
	}
	// console.log('this_viewer',this_viewer);
	return this_viewer;
}

pdfwheel.Annotation.prototype.recordFabricHistory = function (this_state_data) {
	// console.log('前一部分历史记录',this_state_data);
	var this_viewer = this.shotViewer();
	//如果是在undo和redo中突然增加了新记录，则要从当前位置重新记录列表，把当前位置之后的都删除
	this.previous_history = this.previous_history.slice(0, this.history_index);
	this.previous_history.push({
		'this_viewer': this_viewer,
		'this_state_data': this_state_data,
		'first_state': false,
	});

	// console.log('保存历史记录');

	//超过历史长度后
	if (this.previous_history.length > this.max_history_length) {
		// console.log('超过长度，取后十一');
		this.previous_history = this.previous_history.slice(1, this.max_history_length + 1);
	}
	this.history_index = this.previous_history.length;
}

//update or delete annotation  更新或删除批注
pdfwheel.Annotation.prototype.undoAnnotation = function () {
	var tips = {
		'zh-cn': [
			'无更多历史记录可撤销（最多10步）!',
		],
		'en': [
			'no more history to undo(max=10)!',
		]
	}[tips_language];
	// console.log('当前索引',this.history_index);
	// console.log('历史记录长度',this.previous_history.length);
	if (this.history_index <= 1) {
		alert(tips[0]);
		return;
	}
	this.history_index = this.history_index - 1;
	this.fabric_list = [];
	// var that=this;
	var this_data = this.previous_history[this.history_index - 1];
	var page_number = this_data['this_state_data']['page_number'];
	var anno_content = this_data['this_state_data']['redo'];
	var change_file = this_data['this_state_data']['change_file'];
	// console.log('当前数据',anno_content);

	// 先前的记录
	var last_data = this.previous_history[this.history_index];
	this.setViewer(last_data['this_viewer']);
	var last_page_number = last_data['this_state_data']['page_number'];
	var last_anno_content = last_data['this_state_data']['undo'];
	// console.log('历史记录',last_data);
	// console.log('历史记录',last_data);
	var last_change_file = last_data['this_state_data']['change_file'];
	// console.log('当前数据',anno_content);

	//如果是清除文件，则修改文件
	if (last_page_number != page_number) {
		//如果是清除文件，则修改文件
		if (change_file == true) {
			// console.log('批注文件',anno_content);
			this.setFileAnnotation(anno_content);
		} else {
			this.setOnePageAnnotation(anno_content, page_number);
		}
	}

	// console.log('上一页',last_page_number);
	// console.log('这一页',page_number);
	if (last_change_file == true) {
		// console.log('批注文件',anno_content);
		this.setFileAnnotation(last_anno_content);
	} else {
		this.setOnePageAnnotation(last_anno_content, last_page_number);
	}

	//refresh annotation canvas 刷新注释画布
	// console.log('写入成功');
	this.drawAllPageAnnotations();
	pdfAnnotationUI.cancelOtherButton({
		'id': 'set_file_and_fresh'
	});
}

//update or delete annotation  更新或删除批注
pdfwheel.Annotation.prototype.redoAnnotation = function () {
	var tips = {
		'zh-cn': [
			'无更多撤销的历史记录可恢复（最多10步）!',
		],
		'en': [
			'no more undo history to redo(max=10)!',
		]
	}[tips_language];
	// console.log('索引',this.history_index);
	// console.log('当前列表长度',this.previous_history.length);
	if (this.history_index >= this.max_history_length || this.history_index >= this.previous_history.length) {
		alert(tips[0]);
		return;
	}
	this.fabric_list = [];
	// var that=this;
	this.history_index += 1;
	var this_data = this.previous_history[this.history_index - 1];
	this.setViewer(this_data['this_viewer']);
	// this.setFileAnnotation(this_data['this_state_data']);

	// console.log('当前历史记录',this_data);

	var page_number = this_data['this_state_data']['page_number'];
	var anno_content = this_data['this_state_data']['redo'];
	var change_file = this_data['this_state_data']['change_file'];

	//如果是清除文件，则修改文件
	if (change_file == true) {
		this.setFileAnnotation(anno_content);
	} else {
		this.setOnePageAnnotation(anno_content, page_number);
	}
	//refresh annotation canvas 刷新注释画布
	// console.log('写入成功');
	this.drawAllPageAnnotations();
	pdfAnnotationUI.cancelOtherButton({
		'id': 'set_file_and_fresh'
	});

	// setTimeout(function() {
	// 	that.setFileAnnotation(this_data['this_state_data']);
	// }, 500);
}

pdfwheel.Annotation.prototype.deepEqual = function (obj1, obj2) {
	if (obj1 === obj2) {
		return true;
	}
	if (typeof obj1 !== typeof obj2) {
		return false;
	}
	if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
		return obj1 === obj2;
	}
	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);
	if (keys1.length !== keys2.length) {
		return false;
	}
	for (const key of keys1) {
		if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
			return false;
		}
	}
	return true;
}

//save Fabric data to localStorage(limit file size 5MB) 保存fabric数据到缓存，大小不能超过 5MB
pdfwheel.Annotation.prototype.saveFabricCanvas = function (page_number) {
	var tips = {
		'zh-cn': [
			'页面超过5M大小，保存失败，请删除图片等内容',
		],
		'en': [
			'page annotation beyond 5M, save failed, please delete some image',
		]
	}[this.tips_language];
	var page_id = this.fabric_annos_id_tag + page_number.toString();
	var fabric_annotation_id = this.PDFViewerApplication.baseUrl.split("?")[0] + '_page_fabric_' + page_number.toString();

	var saved_data = this.fabric_list[page_id];
	saved_data['page_canvas']['fabric_canvas_json'] = saved_data['page_canvas']['fabric_canvas'].toJSON(
		this.custom_attr);

	//旧记录
	var old_fabric_obj = this.readFabricAnnotationsForPage(page_number);
	// console.log('保存历史记录');

	//首次编辑时先保存一次历史记录
	var this_history;
	// console.log('加载时首次记录',onload_record_history);
	if (onload_record_history == true) {
		// console.log('首次记录');
		this_history = {
			'undo': old_fabric_obj,
			'redo': old_fabric_obj,
			'page_number': page_number,
			'change_file': false,
		}
		this.recordFabricHistory(this_history);
		onload_record_history = false;
	}


	var content = JSON.stringify(saved_data);
	try {
		if (localStorage.getItem(fabric_annotation_id) !== content) {
			localStorage.setItem(fabric_annotation_id, content);
		}
	} catch (e) {
		alert(tips[0]);
		return;
	}

	//新记录
	var new_fabric_obj = this.readFabricAnnotationsForPage(page_number);
	this_history = {
		'undo': old_fabric_obj,
		'redo': new_fabric_obj,
		'page_number': page_number,
		'change_file': false,
	}
	// console.log('历史记录', this_history);
	//保存历史记录
	this.recordFabricHistory(this_history);
	if (pdfAnnotationUI.show_annotation_list) {
		// console.log('显示列表');
		pdfAnnotationUI.showAnnotationList();
	}
}

//read one Fabric page annotations  读取页面的 Fabric 批注
pdfwheel.Annotation.prototype.readFabricAnnotationsForPage = function (page_number) {
	var this_page_id = this.PDFViewerApplication.baseUrl.split("?")[0] + '_page_fabric_' + page_number.toString();
	var this_page_annotation = null;
	if (localStorage.getItem(this_page_id) !== null) {
		try {
			this_page_annotation = JSON.parse(localStorage.getItem(this_page_id));
		} catch {
			return null;
		}
		// console.log('页面', this_page_annotation);
		if (this_page_annotation == null || Object.keys(this_page_annotation).length === 0) {
			return null;
		}
		if (this_page_annotation['page_canvas']['fabric_canvas_json']['objects'].length == 0) {
			return null;
		}
	}
	// console.log('页码',page_number,'批注',this_page_annotation);
	return this_page_annotation;
}

//read one page annotation [highlight/underline] data. 读取某个页面的批注数据[高亮/下划线]
pdfwheel.Annotation.prototype.readAnnotationsForPage = function (annotation_id) {
	var this_page_annotation = [];
	if (localStorage.getItem(annotation_id) !== null) {
		try {
			this_page_annotation = JSON.parse(localStorage.getItem(annotation_id));
		} catch {
			return [];
		}
		// console.log('批注',this_page_annotation);
		if (this_page_annotation == null) {
			this_page_annotation = [];
		} else {
			for (var i = 0; i < this_page_annotation.length; i++) {
				if (Object.prototype.hasOwnProperty.call(this_page_annotation[i], 'id') == false ||
					this_page_annotation[i]
						.id == null) {
					this_page_annotation[i].id = this.buildId(i + 1);
				}
			}
		}
	} else {
		this_page_annotation = [];
	}
	return this_page_annotation;
}


//set id and member_id for created path 创建绘制的路径之后给定批注id和member_id
pdfwheel.Annotation.prototype.afterPathCreated = function (opt, current_canvas) {
	var tips = {
		'zh-cn': [
			'添加批注',
		],
		'en': [
			'add comments',
		]
	}[this.tips_language];
	// console.log('路径创建完成',current_canvas.lowerCanvasEl.id);
	// var current_canvas_id=current_canvas.lowerCanvasEl.id;
	// console.log('点击的画布', current_canvas.lowerCanvasEl.id);
	// e.set('id','绘制的路径');
	var path_id = this.buildId(current_canvas.getObjects().length + 1);
	opt.path.id = path_id;
	opt.path.member_id = pdfAnnotation.getRandomMemberID();
	opt.path.my_type = 'path';
	opt.path.comment = tips[0];
	opt.backup_opacity = 1;
	// this.saveAllFabricData();
	//绘制annotationLayer
	var fabric_id = current_canvas.lowerCanvasEl.id;
	var page_number = fabric_id.split('-')[3];

	this.saveFabricCanvas(page_number); //保存当前页数据

	var annotation_layer_id = "page-" + page_number + "-annotationLayer";
	var this_annotation_layer = document.getElementById(annotation_layer_id);
	this.addFabricObjToAnnotationTextLayer(this_annotation_layer);
}

//保存单页数据
pdfwheel.Annotation.prototype.saveOnePageByCanvas = function (current_canvas) {
	var fabric_id = current_canvas.lowerCanvasEl.id;
	var page_number = fabric_id.split('-')[3];
	this.saveFabricCanvas(page_number); //保存当前页数据
}

pdfwheel.Annotation.prototype.buildId = function (id_number) {
	var this_time = new Date().getTime();
	// console.log('当前时间',this_time_second+6*86400);
	var id = this_time + '_' + id_number;
	return id;
}

pdfwheel.Annotation.prototype.fabricMouseUp = function (opt) {
	var that = this;
	clearTimeout(that.timer); //清除未执行的定时器
	if (that.current_click_type != 'select') {
		that.timer = setTimeout(function () {
			that.processFabricMouseUp(opt);
		}, 200);
	} else {
		that.processFabricMouseUp(opt);
	}
}

// listen fabric mouse up
// pdfwheel.Annotation.prototype.processFabricMouseUp=function(opt) {
pdfwheel.Annotation.prototype.processFabricMouseUp = function (opt) {
	if (this.current_click_type != 'select') {
		this.computeAddPosition(opt);
	} else {
		if (opt.button === 1) {
			var annos_page_id = null;
			for (var key in this.fabric_list) {
				var active_objs = this.fabric_list[key].page_canvas.fabric_canvas.getActiveObject();
				if (active_objs != null) {
					var annos_page_id = key;
					break;
				}

			}

			if (annos_page_id == null) {
				this.hiddenMenu();
				// this.saveAllFabricData();
				return;
			}
			var page_number = annos_page_id.split('-')[3];
			var fabricObj = this.fabric_list[annos_page_id].page_canvas.fabric_canvas;

			var active_objs = fabricObj.getActiveObject();
			if (active_objs == null) {
				this.hiddenMenu();
			} else {
				var ac_objs = fabricObj.getActiveObjects();
				ac_objs.forEach(this_obj => {
					this_obj.set({
						// borderColor: 'red', //color 边框颜色
						// cornerColor: 'red', //color 控制角颜色
						// cornerSize: 10, //size 控制角大小
						// transparentCorners: false ,//opacity 控制角填充色不透明

					});
				});
				// // console.log('选中',ac_objs);
				if (ac_objs.length > 1) {
					active_objs.set({
						hasBorders: false,
						// borderColor: 'red', //color 边框颜色
						borderScaleFactor: 2,
						hasControls: false,
						perPixelTargetFind: true, //无法通过透明部分选中
						hasRotatingPoint: false, //rotate or not 选中时是否可以旋转
						lockMovementX: true, //move in X or not X轴是否可被移动(true为不可，因为前缀是lock)
						lockMovementY: true, //move in Y or not Y轴是否可被移动(true为不可，因为前缀是lock)

					});

				}
				if (active_objs.text === 'click to input text') {
					active_objs.text = '';
				}
				//隐藏截图按钮
				var screen_shot_btn = document.getElementById("ff-panel-screenshot");
				screen_shot_btn.setAttribute('hidden', true);

				//如果遇到截图框则显示截图按钮
				// console.log(ac_objs);
				if (ac_objs.length == 1) {
					var first_obj = ac_objs[0];
					if (first_obj['my_type'] == 'screenshot') {
						var screen_shot_btn = document.getElementById("ff-panel-screenshot");
						screen_shot_btn.removeAttribute('hidden');
					}
				}

				// 获取当前元素
				this.active_fabric_obj = {
					'active_canvas': fabricObj,
					'active_element': ac_objs,
					'page_number': page_number,
				}

				// console.log('选中元素', ac_objs);

				// console.log('click_opt', opt.target);
				var menu = document.getElementById('my-menu');
				// 将菜单展示出来
				menu.style = `
				      visibility: visible;
				      z-index: 1000;
				`
				show_my_menu = true; //显示控制面板
			}
		}
	}
	//重绘annotation图层的可选对象
	// console.log('点击事件',opt.e.target.parentNode.parentNode);
	// this.saveAllFabricData();
	this.redrawAnnotationLayer(opt);
}

//hidemenu 隐藏菜单
pdfwheel.Annotation.prototype.hiddenMenu = function () {
	if (show_my_menu == true) {
		if (changed_number_value == true) {
			var this_page_number = this.active_fabric_obj['page_number'];
			this.saveFabricCanvas(this_page_number);
			changed_number_value = false;
			// console.log('隐藏列表，当前页面',this_page_number);
		}
		var menu = document.getElementById('my-menu');
		menu.style = `
				visibility: hidden;
				z - index: -100;
				`
		// The current active element is null 当前活动元素置空
		this.active_fabric_obj = {
			'page_number': null,
			'active_element': null,
			'page_number': null,
		}
		show_my_menu = false;
	}
	this.deactivateAllObjs(); //取消所有元素的激活状态
}

pdfwheel.Annotation.prototype.getCurrentClickCanvas = function (e) {
	// var page_div = e.e.target.parentNode.parentNode;
	var page_div = e.target.parentNode.parentNode;
	var page_number = page_div.getAttribute('data-page-number');
	var annos_page_id = this.fabric_annos_id_tag + page_number;
	var this_canvas = this.fabric_list[annos_page_id].page_canvas.fabric_canvas;
	return this_canvas;
}

// 鼠标在画布上松开
pdfwheel.Annotation.prototype.computeAddPosition = function (e) {
	// console.log('触屏点击事件',e.e.type);
	this.upPoint = e.absolutePointer;
	var downPoint = this.downPoint;
	var upPoint = this.upPoint;
	// 定位参数计算
	let top = Math.min(downPoint.y, upPoint.y)
	let left = Math.min(downPoint.x, upPoint.x)
	let width = Math.abs(downPoint.x - upPoint.x)
	let height = Math.abs(downPoint.y - upPoint.y)
	// console.log('长宽', width, height);

	var this_canvas = this.getCurrentClickCanvas(e.e);
	// console.log('拖选出了区域');
	if (this.current_click_type == 'add_screenshot') {
		this.adding_screen_shot_text.set('left', left);
		this.adding_screen_shot_text.set('top', top - this.adding_screen_shot_text.height - 10);
		this.adding_screen_shot_text.setCoords();

		this.adding_screen_shot_item.set('left', left);
		this.adding_screen_shot_item.set('top', top);
		this.adding_screen_shot_item.set('width', width);
		this.adding_screen_shot_item.set('height', height);
		this.adding_screen_shot_item.setCoords();

		this_canvas.add(this.adding_screen_shot_item);
		this_canvas.add(this.adding_screen_shot_text);

		//生成截屏对象时直接截屏当前区域
		var page_div = e.e.target.parentNode.parentNode;
		var page_number = parseInt(page_div.getAttribute('data-page-number'));
		this.clipCanvasWhenCreate(this_canvas, this.adding_screen_shot_item, page_number);
	} else if (this.current_click_type == 'add_circle') {
		this.adding_item.set('left', left);
		this.adding_item.set('top', top);
		this.adding_item.set('radius', width / 2);
		this.adding_item.setCoords();
		this_canvas.add(this.adding_item);
	} else if (this.current_click_type == 'add_line') {
		if (shiftKeyPressed == false) {
			this.adding_item.set('x1', left);
			this.adding_item.set('y1', top);
			this.adding_item.set('x2', left + width);
			this.adding_item.set('y2', top + height);
		} else {
			this.adding_item.set('left', left);
			this.adding_item.set('top', top);
			this.adding_item.set('width', width);
		}
		this.adding_item.setCoords();
		this_canvas.add(this.adding_item);
	} else {
		this.adding_item.set('left', left);
		this.adding_item.set('top', top);
		//矩形框需要加上宽度，除了以上则是文本框、图片和箭头，只需要起点即可
		if (this.current_click_type == 'add_rect') {
			this.adding_item.set('width', width);
			this.adding_item.set('height', height);
		}
		this.adding_item.setCoords();
		this_canvas.add(this.adding_item);
	}

	this.initialFabricState(this_canvas);
	this.deactivateAllObjs();
	this.saveOnePageByCanvas(this_canvas);
	// this.saveAllFabricData();
}

pdfwheel.Annotation.prototype.clipCanvasWhenCreate = function (fabricObj, screen_area, page_number) {
	var fabric_canvas_height = fabricObj.height;
	var fabric_canvas_width = fabricObj.width;

	var screen_left = screen_area.left;
	var screen_top = screen_area.top;
	var screen_width = screen_area.width;
	var screen_height = screen_area.height;
	var screen_scale_x = screen_area.scaleX;
	var screen_scale_y = screen_area.scaleY;

	var screen_shot_area = [screen_left / fabric_canvas_width, screen_top / fabric_canvas_height, screen_width /
		fabric_canvas_width, screen_height / fabric_canvas_height, screen_scale_x, screen_scale_y
	];

	this.clipCanvas(page_number, screen_shot_area, screen_area);
}

//截取位置
pdfwheel.Annotation.prototype.clipCanvas = function (page_number, area, scrrenshot_area) {
	var pages = document.getElementsByClassName('page');
	var current_page = pages[page_number - 1];

	var current_canvasWrapper = current_page.getElementsByClassName('canvasWrapper')[0];
	var current_canvas = current_canvasWrapper.getElementsByTagName('canvas')[0];

	var current_canvas_true_width = current_canvas.width;
	var current_canvas_true_height = current_canvas.height;

	var current_true_left = current_canvas_true_width * area[0];
	var current_true_top = current_canvas_true_height * area[1];
	var current_true_width = current_canvas_true_width * area[2] * area[4];
	var current_true_height = current_canvas_true_height * area[3] * area[5];

	//大于页面长宽之后取页面位置
	if ((current_true_left + current_true_width) > current_canvas_true_width) {
		current_true_width = current_canvas_true_width - current_true_left;
	}

	if ((current_true_top + current_true_height) > current_canvas_true_height) {
		current_true_height = current_canvas_true_height - current_true_top;
	}

	//小于0也取边界
	if (current_true_left < 0) {
		current_true_left = 0;
	}

	if (current_true_top < 0) {
		current_true_top = 0;
	}

	var current_ctx = current_canvas.getContext('2d');
	var clip_imgdata = current_ctx.getImageData(current_true_left, current_true_top, current_true_width,
		current_true_height);

	// console.log('真实宽高',current_true_left,current_true_top,current_true_width,current_true_height);


	var tmp_canvas = document.createElement('canvas');
	tmp_canvas.width = current_true_width;
	tmp_canvas.height = current_true_height;
	var tmp_ctx = tmp_canvas.getContext('2d');
	tmp_ctx.putImageData(clip_imgdata, 0, 0);
	// ctx.drawImage(img, 0, 0, newWidth, newHeight);

	//保存文件
	tmp_canvas.toBlob(function (blob) {
		//截图完成后的事件，可以增加自己的方法
		saveAs(blob, page_number + '.png');

		//用于自定义表单显示跳转等
		var screen_shot_item = {
			"text": scrrenshot_area['comment'], //截屏批注文字
			"id": scrrenshot_area['id'], //截屏批注id
			"page_number": page_number, //截屏所在页码
		}
		// console.log(screen_shot_item);
	});
}

//按照矩形区域截图
pdfwheel.Annotation.prototype.screenShotEl = function () {
	var screen_area = this.active_fabric_obj['active_element'][0];

	var fabricObj = this.active_fabric_obj['active_canvas'];
	var page_number = this.active_fabric_obj['page_number'];
	var fabric_canvas_height = fabricObj.height;
	var fabric_canvas_width = fabricObj.width;

	var screen_left = screen_area.left;
	var screen_top = screen_area.top;
	var screen_width = screen_area.width;
	var screen_height = screen_area.height;
	var screen_scale_x = screen_area.scaleX;
	var screen_scale_y = screen_area.scaleY;

	var screen_shot_area = [screen_left / fabric_canvas_width, screen_top / fabric_canvas_height, screen_width /
		fabric_canvas_width, screen_height / fabric_canvas_height, screen_scale_x, screen_scale_y
	];

	this.clipCanvas(page_number, screen_shot_area, screen_area);
}

pdfwheel.Annotation.prototype.deactivateAllObjs = function () {
	// console.log('取消所有对象的选中状态');
	for (var key in this.fabric_list) {
		this.fabric_list[key].page_canvas.fabric_canvas.discardActiveObject();
		this.fabric_list[key].page_canvas.fabric_canvas.requestRenderAll();
	}
}

// 鼠标在画布上按下
pdfwheel.Annotation.prototype.fabricCanvasMouseDown = function (e) {
	this.downPoint = e.absolutePointer;
}

pdfwheel.Annotation.prototype.cancleAddFabricObj = function (event) {
	clearTimeout(this.timer); //清除未执行的定时器
	if (this.current_click_type != 'select') {
		var this_canvas = this.getCurrentClickCanvas(event.e);
		this.initialFabricState(this_canvas); //清空添加状态
	}
}

pdfwheel.Annotation.prototype.keepTextFollowScreenShot = function (obj) {
	if (obj.target.my_type == 'screenshot') {
		var screenshot_text_id = obj.target.id + '_text';
		// console.log('文字id',screenshot_text_id);
		var fabric_canvas = obj.target.canvas;
		var items = fabric_canvas.getObjects();
		for (var i = 0; i < items.length; i++) {
			if (items[i].id == screenshot_text_id) {
				var this_left = obj.target.left;
				var this_top = obj.target.top - items[i].height * items[i].scaleY - 10;

				if (this_top < 0) {
					this_top = 0;
				}

				items[i].set('left', this_left);
				items[i].set('top', this_top);

				items[i].setCoords();
				// console.log(items[i]);
				fabric_canvas.requestRenderAll();
				break;
			}
		}
	}
}

pdfwheel.Annotation.prototype.keepScreenShotTextScale = function (obj) {
	// console.log(obj.target);
	if (obj.target.my_type == 'screenshot') {
		this.keepTextFollowScreenShot(obj);
	}

}

//画布对象是否可被选中
pdfwheel.Annotation.prototype.changeAllCanvasSelectState = function () {
	for (var key in this.fabric_list) {
		this.changeOneCanvasSelectState(this.fabric_list[key].page_canvas.fabric_canvas);
	}
}

pdfwheel.Annotation.prototype.changeOneCanvasSelectState = function (current_canvas) {
	//确定是否可以选中
	// console.log('this.current_click_type',this.current_click_type);
	switch (this.current_click_type) {
		case 'select':
			current_canvas.selection = true
			current_canvas.selectionColor = 'rgba(100, 100, 255, 0.3)'
			current_canvas.selectionBorderColor = 'rgba(255, 255, 255, 0.3)'
			current_canvas.skipTargetFind = false // 允许选中
			break
		default:
			current_canvas.selectionColor = 'transparent'
			current_canvas.selectionColor = default_rect_fill_color;
			current_canvas.selectionBorderColor = 'rgba(0, 0, 0, 0.2)'
			current_canvas.skipTargetFind = true // 禁止选中
			break
	}
}

//set annotation for current file 为当前页面设置批注
pdfwheel.Annotation.prototype.setOnePageAnnotation = function (page_content, page_number) {
	var annotation_id = this.PDFViewerApplication.baseUrl.split("?")[0] + '_page_' + page_number.toString();
	var fabric_annotation_id = PDFViewerApplication.baseUrl.split("?")[0] + '_page_fabric_' + page_number.toString();
	var old_anno_content;
	var content;

	if (page_content != null) {
		old_anno_content = JSON.stringify(page_content['page_annotations']);
		content = JSON.stringify(page_content);
	} else {
		old_anno_content = JSON.stringify([]);
		content = JSON.stringify({});;
	}
	if (localStorage.getItem(annotation_id) !== old_anno_content) {
		localStorage.setItem(annotation_id, old_anno_content);
	}
	if (localStorage.getItem(fabric_annotation_id) !== content) {
		localStorage.setItem(fabric_annotation_id, content);
	}
}

//set annotation for current file 为当前页面设置批注
pdfwheel.Annotation.prototype.setFileAnnotation = function (anno_contents) {
	this.clearOldAnnotations();

	this.fabric_list = {}; //clear all pages' Fabric layer and redraw 清空 Fabric 图层后重画
	show_state = {}; //是否默认展开列表
	for (var key in anno_contents) {
		// console.log('key',key);
		var page_number = key.split('-')[3];
		// set old version localstorage 设置旧版缓存
		this.setOnePageAnnotation(anno_contents[key], page_number);
	}
	//refresh annotation canvas 刷新注释画布
	// console.log('写入成功');
	this.drawAllPageAnnotations();
	pdfAnnotationUI.cancelOtherButton({
		'id': 'set_file_and_fresh'
	});
	// this.saveAllFabricData();
}

pdfwheel.Annotation.prototype.clearOldAnnotations = function () {
	var pages_count = PDFViewerApplication.pagesCount;
	for (var i = 1; i <= pages_count; i++) {
		// console.log('my_member_id',my_member_id,'页码',i);
		this.clearAnnotationFromPageLocalStorage(i, 'user_1');
		this.clearAllAnnotationLayerItem(i); //删除顶层对象
	}

	//处理完之后重新渲染
	this.refreshFabricState();
	this.drawAllPageAnnotations();
}

pdfwheel.Annotation.prototype.readFileAnnotations = function () {
	var page_count = PDFViewerApplication.pagesCount;
	var this_file_annotations = {};
	for (var i = 1; i <= page_count; i++) {
		var old_fabric_obj = this.readFabricAnnotationsForPage(i);
		if (old_fabric_obj) {
			// this_file_annotations[current_canvas_page_fabric_id]=old_fabric_obj;
			this_file_annotations[this.fabric_annos_id_tag + i.toString()] = old_fabric_obj;
		}
	}
	// console.log(this_file_annotations);
	if (localStorage.getItem(this.PDFViewerApplication.baseUrl.split("?")[0] + '/myAnnotation') !== JSON.stringify(this_file_annotations)) {
		localStorage.setItem(this.PDFViewerApplication.baseUrl.split("?")[0] + '/myAnnotation', JSON.stringify(this_file_annotations));
	}
	return this_file_annotations;
}

//save annotation data to json 保存批注数据到 json 
pdfwheel.Annotation.prototype.saveAnnotationsJson = function (annotation_id, data) {
	var content = JSON.stringify(data);
	if (localStorage.getItem(annotation_id) !== content) {
		localStorage.setItem(annotation_id, content);
	}
	//save annotation to Fabric list 将批注保存到fabric_list中
	var split_str = annotation_id.split('_');
	var page_number = split_str[split_str.length - 1];
	// console.log('annotation_id',annotation_id);
	var page_id = this.fabric_annos_id_tag + page_number.toString();
	// console.log(page_id);
	if (this.fabric_list[page_id] == undefined) {
		return;
	}
	this.fabric_list[page_id].page_annotations = data; //record highlight and underline data 记录高亮下划线等内容
	// this.saveFabricCanvas(page_number);
}

pdfwheel.Annotation.prototype.getRandomMemberID = function () {
	// var rand = Math.floor(Math.random() * all_member_id_list.length);
	// return all_member_id_list[rand]['id'];

	return this.current_member.id;
}

// add annotation to fabric 将批注添加到 fabric
pdfwheel.Annotation.prototype.addAnnotationToFabric = function (this_annotation, this_page) {
	// console.log('绘制对象',this_annotation);
	var this_page_number = this_annotation.page_number;
	var pages = document.getElementsByClassName('page');
	this_page = pages[this_page_number - 1];

	var this_fabric_obj = this.getFabricObj(this_annotation.page_number);
	var this_wrapper = this_page.getElementsByClassName('canvasWrapper')[0];
	if (this_fabric_obj) {
		this.drawOnFabric(this_annotation, this_fabric_obj.page_canvas.fabric_canvas, this_wrapper);
	} else {
		this.drawAnnotationOnFabricPageFirstTime(this_wrapper, this_annotation.page_number);
	}
}

//get all fabric layer objects  获取所有 Fabric 页面对象
pdfwheel.Annotation.prototype.getFabricObj = function (page_number) {
	var page_id = this.fabric_annos_id_tag + page_number.toString();
	return this.fabric_list[page_id];
}


pdfwheel.Annotation.prototype.clearFileAnnotations = function () {
	var tips = {
		'zh-cn': [
			'确认清空本人(',
			')的所有注释？(含不可见对象)',
		],
		'en': [
			'clear your(',
			') all annotations?(including invisible objects)',
		]
	}[tips_language];
	var this_member_id = this.getRandomMemberID();

	if (confirm(tips[0] + this_member_id + tips[1])) {
		for (var i = 0; i < localStorage.length; i++) {
			var key = localStorage.key(i);

			// Check if the key contains the pattern 'bitstreams'
			if (key.includes('content?page')) {
				localStorage.removeItem(key);
			}
		}
		var pages_count = PDFViewerApplication.pagesCount;

		var old_file_obj = this.readFileAnnotations();
		for (var i = 1; i <= pages_count; i++) {
			// console.log('my_member_id',my_member_id,'页码',i);
			this.clearAnnotationFromPageLocalStorage(i, this_member_id);
			this.clearAllAnnotationLayerItem(i); //删除顶层对象
		}
		this.saveDataAfterClearFile(old_file_obj);
		//处理完之后重新渲染
		this.refreshFabricState();
		this.drawAllPageAnnotations();
	}
}

//save Fabric data to localStorage(limit file size 5MB) 保存fabric数据到缓存，大小不能超过 5MB
pdfwheel.Annotation.prototype.saveDataAfterClearFile = function (old_fabric_obj) {
	//首次编辑时先保存一次历史记录
	var this_history;
	// console.log('加载时首次记录',onload_record_history);
	if (onload_record_history == true) {
		// console.log('首次记录');
		this_history = {
			'undo': old_fabric_obj,
			'redo': old_fabric_obj,
			'page_number': 0,
			'change_file': true,
		}
		// console.log('首次历史记录', this_history);
		this.recordFabricHistory(this_history);
		onload_record_history = false;
	}

	var new_fabric_obj = this.readFileAnnotations();
	this_history = {
		'undo': old_fabric_obj,
		'redo': new_fabric_obj,
		'page_number': 0,
		'change_file': true,
	}
	// console.log('历史记录', this_history);
	//保存历史记录
	this.recordFabricHistory(this_history);
	if (pdfAnnotationUI.show_annotation_list) {
		// console.log('显示列表');
		pdfAnnotationUI.showAnnotationList();
	}
}

pdfwheel.Annotation.prototype.refreshFabricState = function () {
	this.fabric_list = {};
	show_state = {}; //是否默认展开批注列表
}

pdfwheel.Annotation.prototype.clearAnnotationFromPageLocalStorage = function (page_number, my_member_id) {
	var old_fabric_obj = this.readFabricAnnotationsForPage(page_number);
	if (old_fabric_obj) {
		old_fabric_obj['page_canvas']['fabric_canvas_json']['objects'] = {};
		old_fabric_obj['page_annotations'] = [];

		//设置fabric缓存
		var fabric_annotation_id = this.PDFViewerApplication.baseUrl.split("?")[0] + '_page_fabric_' + page_number.toString();
		var content = JSON.stringify(old_fabric_obj);
		if (localStorage.getItem(fabric_annotation_id) !== content) {
			localStorage.setItem(fabric_annotation_id, content);
		}

		//设置旧版缓存
		var annotation_id = this.PDFViewerApplication.baseUrl.split("?")[0] + '_page_' + page_number.toString();
		var old_anno_content = JSON.stringify([]);
		if (localStorage.getItem(annotation_id) !== old_anno_content) {
			localStorage.setItem(annotation_id, old_anno_content);
		}
		// console.log('高亮原长度',this_page_annotations.length,'高亮新长度',new_page_annos.length);
	}
}

//删除某页的批注
pdfwheel.Annotation.prototype.deleteOnePageAnnotations = function (page_number, this_member_id) {
	var fabricObj = this.getFabricObj(page_number);
	var fabric_canvas = fabricObj.page_canvas.fabric_canvas;
	var items = fabric_canvas.getObjects();
	//删除多个批注对象
	items.forEach(activeEl => {
		if (activeEl.member_id == this_member_id) {
			fabric_canvas.remove(activeEl);
			this.deleteAnnotationsListByID(page_number, activeEl.id);
		}
	})
	// this.saveFabricCanvas(page_number);
}

pdfwheel.Annotation.prototype.deleteAnnotationsListByID = function (page_number, anno_id) {
	var this_annotation_id = PDFViewerApplication.baseUrl + '_page_' + page_number;
	var this_annotations_json = this.readAnnotationsForPage(this_annotation_id);
	var anno_number = this.getAnnoNumber(this_annotations_json, anno_id);
	this_annotations_json.splice(anno_number, 1);
	//重新修改注释
	this.saveAnnotationsJson(this_annotation_id, this_annotations_json);
	// this.saveAllFabricData();
	//删除批注层对象
	this.deleteAnnotationLayerItem(page_number, anno_id);
	JSplump.deleteConnectByID(page_number, anno_id);
}

pdfwheel.Annotation.prototype.deleteAnnotationLayerItem = function (page_number, anno_id) {
	var this_link_id = "page-" + page_number + "-anno-" + anno_id + "-container-link";

	//删除元素
	var annotation_layer_id = "page-" + page_number + "-annotationLayer";
	var this_annotation_layer = document.getElementById(annotation_layer_id);
	var this_link_e = document.getElementById(this_link_id);
	if (this_link_e) {
		this_annotation_layer.removeChild(this_link_e);
	}


	//删除附属元素
	for (var i = 0; i < 500; i++) {
		var this_link_i_id = "page-" + page_number + "-anno-" + anno_id + '-index-' + i.toString() +
			"-container-link";
		this_link_i_e = document.getElementById(this_link_i_id);
		if (this_link_i_e) {
			this_annotation_layer.removeChild(this_link_i_e);
		} else {
			break;
		}
	}
}

pdfwheel.Annotation.prototype.getAnnoNumber = function (annotations_data, anno_id) {
	for (var i = 0; i < annotations_data.length; i++) {
		if (annotations_data[i].id == anno_id) {
			return i;
		}
	}
	return null;
}

//update or delete annotation  更新或删除批注
pdfwheel.Annotation.prototype.old_undoAnnotation = function () {
	var tips = {
		'zh-cn': [
			'当前页面所有批注已被删除!',
		],
		'en': [
			'all annotations in this page has been deleted!',
		]
	}[tips_language];

	var page_number = PDFViewerApplication.page;

	var fabricObj = this.getFabricObj(page_number);
	var fabric_canvas = fabricObj.page_canvas.fabric_canvas;
	var anno_objects = fabric_canvas.getObjects();

	if (anno_objects.length >= 1) {
		//删除最后一个批注
		var last_anno = anno_objects[anno_objects.length - 1];
		fabricObj.page_canvas.fabric_canvas.remove(last_anno);
		this.deleteAnnotationsListByID(page_number, last_anno.id);
	} else {
		alert(tips[0]);
	}
	event.stopPropagation();
}

//delete annotation 删除批注
pdfwheel.Annotation.prototype.deleteAnnotation = function (node) {
	debugger;
	var tips = {
		'zh-cn': [
			'第 ',
			' 页-共 ',
			' 项',
		],
		'en': [
			'page ',
			'-',
			' annotations',
		]
	}[tips_language];

	//关闭历史
	this.closeAnnotationHistory();

	//delete html element 删除html元素
	var parent_node = node.parentNode;
	var grand_node = parent_node.parentNode;
	var this_annotations_json = this.updateAnnotationComent('', parent_node.id, 'delete_annotation');

	for (var i = 0; i < localStorage.length; i++) {
		var key = localStorage.key(i);

		// Check if the key contains the pattern 'bitstreams'
		if (key.includes(parent_node.id)) {
			localStorage.removeItem(key);
		}
	}

	var page_num = parent_node.id.split('-')[1];

	var fabricObj = this.getFabricObj(page_num);
	if (fabricObj == undefined) {
		return;
	}
	var fabric_canvas = fabricObj.page_canvas.fabric_canvas;
	var items = fabric_canvas.getObjects();

	var title_id = 'page-' + page_num + '-anno-' + 'title-p';
	var this_title = document.getElementById(title_id);
	if (this_title) {
		this_title.innerText = tips[0] + page_num + tips[1] + items.length + tips[2];
		// this_title.innerText=''
		// Delete the page annotation list when there is only one element 只有一个元素时删除该页列表
		if (grand_node) {
			grand_node.removeChild(parent_node);
			if (items.length == 0) {
				grand_node.parentNode.removeChild(grand_node);
			}
		}
		// refreshCanvas();
	}
	this.saveFabricCanvas(page_num); //保存结果
}

pdfwheel.Annotation.prototype.closeAnnotationHistory = function () {
	var his_container = document.getElementById('my_annotation_history');
	his_container.innerHTML = '';
	his_container.style.left = '-200px';
	his_container.style.top = '-500px';
	his_container.setAttribute('hidden', true);
}

//input comment for highlight and underline text   为高亮和下划线批注增加评论
pdfwheel.Annotation.prototype.inputComment = function (evt, node) {
	var theEvent = evt || window.event || arguments.callee.caller.arguments[0]; //兼容IE、FF、Google
	if (theEvent.keyCode == 13) {
		node.blur();
		//enter to save 回车后保存
		node.innerHTML = node.innerHTML.replace('<br>', '');
		// console.log('注释id',node.id);
		var this_annotations_json = this.updateAnnotationComent(node.innerText, node.id, 'update_comment');
		var page_number = node.id.split('-')[1];
		this.saveFabricCanvas(page_number);
		// console.log('当前节点id',node.id);
	}
}

pdfwheel.Annotation.prototype.saveComment = function (comment_id) {
	//enter to save 回车后保存
	var node = document.getElementById(comment_id);
	node.innerHTML = node.innerHTML.replace('<br>', '');
	// console.log('注释id',node.id);
	var this_annotations_json = this.updateAnnotationComent(node.innerText, node.id, 'update_comment');
	// var this_annotations_json = this.updateAnnotationComent(node.innerHTML, node.id, 'update_comment');
	var page_number = node.id.split('-')[1];
	this.saveFabricCanvas(page_number);
}

//更新fabric的批注
pdfwheel.Annotation.prototype.updateFabricComment = function (page_number, anno_id, new_comment) {
	var fabricObj = this.getFabricObj(page_number);
	var fabric_canvas = fabricObj.page_canvas.fabric_canvas;
	var items = fabric_canvas.getObjects();
	for (var i = 0; i < items.length; i++) {
		if (items[i].id == anno_id) {
			items[i]['comment'] = new_comment;
			break;
		}
	}
}

pdfwheel.Annotation.prototype.updateAnnotationComent = function (new_comment, full_anno_id, op) {
	// console.log('id',full_anno_id);
	var infos = full_anno_id.split('-');
	// console.log('id划分后',infos);
	var this_annotation_id = PDFViewerApplication.baseUrl + '_page_' + infos[1];
	var this_annotations_json = this.readAnnotationsForPage(this_annotation_id);
	var anno_id = infos[3];
	var anno_number = this.getAnnoNumber(this_annotations_json, anno_id);
	if (op == 'update_comment') {
		this.updateFabricComment(infos[1], anno_id, new_comment);
		//针对高亮和下划线对象的批注修改
		if (anno_number != null) {
			this_annotations_json[anno_number].comment = new_comment;
		}
	} else {
		//删除下划线和高亮对象
		if (anno_number != null) {
			this_annotations_json.splice(anno_number, 1);
		}
		//Delete annotation objects on the fabric layer after they are deleted 删除注释对象后在fabric层上清除对象
		this.deleteFabricObjByID(infos[1], anno_id);
	}
	this.saveAnnotationsJson(this_annotation_id, this_annotations_json);
	// saveAllFabricData(); //保存所有批注
	// showAnnotationList();
	return this_annotations_json;
}

pdfwheel.Annotation.prototype.clearPageAnnotations = function (node) {
	var tips = {
		'zh-cn': [
			'确认清空本人(',
			')第 ',
			' 页的所有注释？(含不可见对象)',
		],
		'en': [
			'clear your(',
			') all annotations of page',
			'?(including invisible objects)',
		]
	}[tips_language];
	var this_member_id = this.getRandomMemberID();
	var page_number = node.id.split('-')[1];
	// console.log('page_number', page_number);
	PDFViewerApplication.page = parseInt(page_number);
	var that = this;
	setTimeout(() => {
		if (confirm(tips[0] + this_member_id + tips[1] + page_number + tips[2])) {
			var old_fabric_obj = that.readFabricAnnotationsForPage(page_number);
			that.deleteOnePageAnnotations(page_number, this_member_id);
			that.saveFabricCanvasAfterClearPage(page_number, old_fabric_obj);
			// that.saveFabricCanvas(page_number,old_fabric_obj);
			// that.saveAllFabricData();
		}
	}, 1000);

}

//save Fabric data to localStorage(limit file size 5MB) 保存fabric数据到缓存，大小不能超过 5MB
pdfwheel.Annotation.prototype.saveFabricCanvasAfterClearPage = function (page_number, old_fabric_obj) {
	var page_id = this.fabric_annos_id_tag + page_number.toString();
	var fabric_annotation_id = this.PDFViewerApplication.baseUrl.split("?")[0] + '_page_fabric_' + page_number.toString();

	var saved_data = this.fabric_list[page_id];
	saved_data['page_canvas']['fabric_canvas_json'] = saved_data['page_canvas']['fabric_canvas'].toJSON(
		this.custom_attr);

	//首次编辑时先保存一次历史记录
	var this_history;
	// console.log('加载时首次记录',onload_record_history);
	if (onload_record_history == true) {
		// console.log('首次记录');
		this_history = {
			'undo': old_fabric_obj,
			'redo': old_fabric_obj,
			'page_number': page_number,
			'change_file': false,
		}
		this.recordFabricHistory(this_history);
		onload_record_history = false;
	}


	var content = JSON.stringify(saved_data);
	try {
		if (localStorage.getItem(fabric_annotation_id) != content) {
			localStorage.setItem(fabric_annotation_id, content);
		}
	} catch (e) {
		alert(tips[0]);
		return;
	}

	//新记录
	var new_fabric_obj = this.readFabricAnnotationsForPage(page_number);
	this_history = {
		'undo': old_fabric_obj,
		'redo': new_fabric_obj,
		'page_number': page_number,
		'change_file': false,
	}
	// console.log('历史记录', this_history);
	//保存历史记录
	this.recordFabricHistory(this_history);
	if (pdfAnnotationUI.show_annotation_list) {
		// console.log('显示列表');
		pdfAnnotationUI.showAnnotationList();
	}
}

//delete fabric object by ID  按照 ID 删除 fabric 对象
pdfwheel.Annotation.prototype.deleteFabricObjByID = function (page_number, anno_id) {
	var tips = {
		'zh-cn': [
			'批注所在页面未加载，删除失败，现已自动加载相应页面，请再次尝试删除！',
		],
		'en': [
			'The page where the annotation is located has not been loaded, so the deletion failed.\nNow the page has been loaded automatically, please try again!',
		]
	}[tips_language];
	var fabricObj = this.getFabricObj(page_number);
	if (fabricObj == undefined) {
		PDFViewerApplication.page = parseInt(page_number);
		setTimeout(() => {
			alert(tips[0]);
		}, 1000);
		return;
	}

	var fabric_canvas = fabricObj.page_canvas.fabric_canvas;
	var items = fabric_canvas.getObjects();
	for (var i = 0; i < items.length; i++) {
		if (items[i].id == anno_id) {
			fabric_canvas.setActiveObject(items[i]);
			fabric_canvas.remove(items[i]);
			break;
		}
	}

	//从annotationLayer中依据id删除元素
	this.deleteAnnotationLayerItem(page_number, anno_id);
	//删除链接线
	// console.log('删除');
	JSplump.deleteConnectByID(page_number, anno_id);
}

//judge current pdf file is from url or not 判断当前文档是否为 URL 形式加载的 pdf
pdfwheel.Annotation.prototype.judgeUrl = function (URL) {
	var str = URL;
	var Expression = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
	var objExp = new RegExp(Expression);
	if (objExp.test(str) == true) {
		return true;
	} else {
		return false;
	}
}


//输入可保存的批注对象
pdfwheel.Annotation.prototype.outputAnnotations = function () {
	// this.saveAllFabricData();
	var is_url = this.judgeUrl(PDFViewerApplication.baseUrl);
	var file_name = '';
	if (is_url == true) {
		file_name = localStorage.getItem('current_anno_pdf_name');
	} else {
		file_name = PDFViewerApplication.baseUrl;
	}

	var this_file_annotations = this.readFileAnnotations();
	return {
		'file_name': file_name,
		'file_annotation': this_file_annotations,
	}
}

pdfwheel.Annotation.prototype.modifyPdf = async function (blobUrl) {
	var tips = {
		'zh-cn': [
			'初始化: ',
			'写入文件: ',
			'下载准备中...',
		],
		'en': [
			'Initial: ',
			'Write File: ',
			'Preparing for download...',
		]
	}[tips_language];
	pdfAnnotationUI.showDownloadLog(tips[2]);
	// increase();
	var no_annotation = true;
	var file_annotation = this.readFileAnnotations();

	if (file_annotation == {}) {
		pdfAnnotationUI.closeDownloadLog();
		return blobUrl;
	}

	// URL for request URL是要请求的地址
	var existingPdfBytes = await fetch(blobUrl).then(res => res
		.arrayBuffer());
	var pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
	var pages = pdfDoc.getPages();

	var pages_imgs = [];
	var canvas_scale = 1;
	for (var j = 0; j < pages.length; j++) {
		var img = await this.drawCanvasForDownload(pages[j], j + 1, canvas_scale);
		if (img != null) {
			var eleImgCover = await pdfDoc.embedPng(img);
			pages_imgs.push(eleImgCover);
		} else {
			pages_imgs.push(null);
		}
	}

	var i = 0;
	pages.forEach(item => {
		var this_img = pages_imgs[i];
		var page_width = item.getSize().width;
		var page_height = item.getSize().height;
		if (this_img != null) {
			var this_scale = this_img.width / page_width;
			item.drawImage(this_img, {
				x: 0,
				y: 0,
				width: this_img.width / this_scale,
				height: this_img.height / this_scale,
			});

			if (this.add_water_mark == true) {
				item.drawText('https://demos.libertynlp.com', {
					x: 0,
					y: page_height / 2,
					size: 40,
					color: PDFLib.rgb(0, 0, 0),
				})
			}
		}
		//拓宽pdf
		// item.setSize(item.getWidth() + 350, item.getHeight());
		i = i + 1;
	})

	var pdfBuffer = await pdfDoc.save();
	const arraybuffer = new Int8Array(pdfBuffer);
	const new_blobUrl = URL.createObjectURL(new Blob([arraybuffer], {
		type: "application/pdf"
	}));
	pdfAnnotationUI.closeDownloadLog();
	return new_blobUrl;
}


// draw canvas and convert to pdf 绘制批注到 canvas 并转换为 png
pdfwheel.Annotation.prototype.drawCanvasForDownload = async function (item, page_number, scale) {
	var old_fabric_obj = this.readFabricAnnotationsForPage(page_number);
	if (old_fabric_obj) {
		var width = parseFloat(old_fabric_obj.page_canvas.width);
		var height = parseFloat(old_fabric_obj.page_canvas.height);

		var anno_canvas = document.createElement("canvas");
		anno_canvas.width = width;
		anno_canvas.height = height;
		var page_id = this.fabric_annos_id_tag + 'for-download-' + page_number.toString();
		anno_canvas.setAttribute('id', page_id);

		var canvas_container = document.getElementById('div-for-download-canvas');
		canvas_container.appendChild(anno_canvas);

		var this_fabric_canvas = new fabric.Canvas(page_id, {
			includeDefaultValues: true,
			isDrawingMode: false,
			fireRightClick: true,
			stopContextMenu: false,
			backgroundColor: 'rgba(255, 255, 255, 0)',
		});

		function loadImageFabricCanvas() {
			return new Promise(resolve => {
				this_fabric_canvas.loadFromJSON(old_fabric_obj.page_canvas.fabric_canvas_json,
					function () {
						var this_canvas = document.getElementById(page_id);
						var pic_url = this_canvas.toDataURL('image/png');
						canvas_container.innerHTML = '';
						resolve(pic_url);
					});
			})
		}

		let this_pic_url = await loadImageFabricCanvas();
		return this_pic_url;
	}
	return null;
}

//observe value change  监听颜色等数字变化
pdfwheel.Annotation.prototype.observeValue = function (property) {
	var that = this;
	document.getElementById(property).oninput = function () {
		// console.log('颜色', this.value);
		var activeEls = that.active_fabric_obj['active_element'];
		var fabricObj = that.active_fabric_obj['active_canvas'];
		var page_number = that.active_fabric_obj['page_number'];
		activeEls.forEach(activeEl => {
			// activeEl[property] = this.value;
			if (activeEl.type == 'group') {
				var objs = activeEl['_objects'];
				for (var i = 0; i < objs.length; i++) {
					if (property == 'fill') {
						if (objs[i].type == 'line') {
							objs[i].set('stroke', this.value);
						} else {
							objs[i].set(property, this.value);
						}
					} else {
						objs[i].set(property, this.value);
					}
				}
			} else {
				activeEl.set(property, this.value);
			}
		});
		fabricObj.requestRenderAll();
		// that.saveFabricCanvas(page_number);
		changed_number_value = true;
	};
}

//observe numeric change  监听不透明度等数字变化
pdfwheel.Annotation.prototype.observeNumeric = function (property) {
	var that = this;
	document.getElementById(property).oninput = function () {
		var activeEls = that.active_fabric_obj['active_element'];
		var fabricObj = that.active_fabric_obj['active_canvas'];
		var page_number = that.active_fabric_obj['page_number'];
		// activeEl[property] = this.value;
		// console.log(property, parseInt(this.value));
		activeEls.forEach(activeEl => {
			var this_value = parseFloat(this.value);
			if (property == 'opacity') {
				this_value = this_value / 100;
			}
			activeEl.set(property, this_value);
			if (property == 'opacity') {
				activeEl.set('backup_opacity', this_value);
			}
		});
		fabricObj.requestRenderAll();
		changed_number_value = true;
		// that.saveFabricCanvas(page_number);
	};
}

// delete select annotation element 删除元素
pdfwheel.Annotation.prototype.delEl = function () {
	var tips = {
		'zh-cn': [
			'确认删除选中对象?'
		],
		'en': [
			'Are you sure to delete it?'
		]
	}[tips_language];
	//delete select annoataion 删除选中对象
	var that = this;
	setTimeout(() => {
		if (confirm(tips[0])) {
			var activeEls = that.active_fabric_obj['active_element'];
			var fabricObj = that.active_fabric_obj['active_canvas'];
			var page_number = that.active_fabric_obj['page_number'];
			//删除多个批注对象
			activeEls.forEach(activeEl => {
				fabricObj.remove(activeEl);
				that.deleteAnnotationsListByID(page_number, activeEl.id);

				//如果遇到截屏则删除截屏文字
				if (activeEl.my_type == 'screenshot') {
					var screenshot_text_id = activeEl.id + '_text';
					var items = fabricObj.getObjects();
					for (var i = 0; i < items.length; i++) {
						if (items[i].id == screenshot_text_id) {
							fabricObj.remove(items[i]);
							that.deleteAnnotationsListByID(page_number, screenshot_text_id);
							break;
						}
					}
				}
			})
			that.hiddenMenu();
			//删除后保存对象
			that.saveFabricCanvas(page_number);
		} else {
			that.hiddenMenu();
		}
	}, 100);
}

pdfwheel.Annotation.prototype.getCurrentPageFabricCanvas = function () {
	var fabric_obj = this.getFabricObj(this.PDFViewerApplication.page);
	return fabric_obj.page_canvas.fabric_canvas;
}


//choose and indert image  选择并插入图像
pdfwheel.Annotation.prototype.insertImage = function (new_image) {
	var tips = {
		'zh-cn': [
			'无法加载图片',
			'添加评论',
		],
		'en': [
			'can not load image',
			'add comments',
		]
	}[this.tips_language];

	//activate selectable mode 激活选择模式
	if (this.fabric_top == false) {
		var top_node = document.getElementById('ff-pointer-obj');
		pdfAnnotationUI.setFabricTop(top_node);
	}
	var that = this;
	var fabricObj = this.getCurrentPageFabricCanvas();
	var fabric_item_id = this.buildId(fabricObj.getObjects().length + 1);
	if (fabricObj) {
		var set_img = new fabric.Image(new_image, {
			id: fabric_item_id,
			member_id: that.getRandomMemberID(),
			my_type: 'image',
			comment: tips[1],
			backup_opacity: 1,
		});
		set_img.crossOrigin = "Anonymous"; //这里是主要添加的属性
		// fabricObj.add(set_img);
		that.adding_item = set_img; //将图片作为待插入对象
		that.current_click_type = 'add_image';
		// console.log('图片加载成功');
		pdfAnnotationUI.changeMouseText(); //修改鼠标文字
		that.changeAllCanvasSelectState();
		// that.saveAllFabricData();
	}
}

pdfwheel.Annotation.prototype.initialFabricState = function (current_canvas) {
	this.downPoint = null;
	this.upPoint = null;
	this.current_click_type = 'select';
	this.changeAllCanvasSelectState();

	this.adding_item = null;
	this.adding_screen_shot_item = null;
	this.adding_screen_shot_text = null;

	pdfAnnotationUI.current_mouse_text = 'mouse text';
	pdfAnnotationUI.removeMouseMoveListen(); //解除鼠标的移动文字跟随的监听
}

pdfwheel.Annotation.prototype.calculateSize = function (img, maxWidth, maxHeight) {
	let width = img.width;
	let height = img.height;

	// calculate the width and height, constraining the proportions
	if (width > height) {
		if (width > maxWidth) {
			height = Math.round((height * maxWidth) / width);
			width = maxWidth;
		}
	} else {
		if (height > maxHeight) {
			width = Math.round((width * maxHeight) / height);
			height = maxHeight;
		}
	}
	return [width, height];
}

//add fabric object添加fabric对象
pdfwheel.Annotation.prototype.addFabricObj = function (node, option) {
	var tips = {
		'zh-cn': [
			'点击输入文字',
			'添加批注',
			'添加截屏批注',
			'截屏',
			'截屏批注',
		],
		'en': [
			'click to input text',
			'add comments',
			'Add screenshot comment',
			'screenshot',
			'screenshot comment',
		]
	}[this.tips_language];

	//activate 激活选择模式
	if (this.fabric_top == false) {
		var top_node = document.getElementById('ff-pointer-obj');
		pdfAnnotationUI.setFabricTop(top_node);
	}

	// setFabricCanvasContainerZIndex(100);
	var fabricObj = this.getCurrentPageFabricCanvas();
	var fabric_item_id = this.buildId(fabricObj.getObjects().length + 1);
	var this_member_id = this.getRandomMemberID();
	switch (option) {
		case 2:
			//addd text 增加文字
			this.current_click_type = 'add_text';
			default_text['id'] = fabric_item_id;
			default_text['member_id'] = this_member_id;
			default_text['my_type'] = 'text';
			default_text['comment'] = tips[1];
			default_text['backup_opacity'] = 1;
			var text = new fabric.IText(tips[0], default_text);
			this.adding_item = text;
			// fabricObj.add(text);
			break;

		case 3:
			//add arrow 增加箭头
			this.current_click_type = 'add_arrow';
			var left_top_offset = 20;
			var triangle = new fabric.Triangle(default_triangle);

			var line = new fabric.Line([0, 100, 170, 100], default_line);

			var objs = [line, triangle];

			var alltogetherObj = new fabric.Group(objs, {
				id: fabric_item_id,
				member_id: this_member_id,
				my_type: 'arrow',
				comment: tips[1],
				backup_opacity: 1,
			});
			alltogetherObj.set({
				scaleX: 2,
				scaleY: 2
			});
			this.adding_item = alltogetherObj;
			// fabricObj.add(alltogetherObj);
			break;
		case 4:
			//add rectangle 增加矩形
			this.current_click_type = 'add_rect';
			default_rectangle['id'] = fabric_item_id;
			default_rectangle['member_id'] = this_member_id;
			default_rectangle['my_type'] = 'rectangle';
			default_rectangle['comment'] = tips[1];
			default_rectangle['backup_opacity'] = 1;
			var rect = new fabric.Rect(default_rectangle);
			this.adding_item = rect;
			// fabricObj.add(rect);
			break;
		case 5:
			//add circle 增加圆形
			this.current_click_type = 'add_circle';
			default_circle['id'] = fabric_item_id;
			default_circle['member_id'] = this_member_id;
			default_circle['my_type'] = 'circle';
			default_circle['comment'] = tips[1];
			default_circle['backup_opacity'] = 1;
			var currentCircle = new fabric.Circle(default_circle);
			this.adding_item = currentCircle;
			// fabricObj.add(currentCircle);
			break;
		case 6:
			this.current_click_type = 'add_screenshot';
			this.addScreenShotObject(tips[2], fabric_item_id, this_member_id);
			break;
		case 7:
			this.current_click_type = 'add_line';
			default_straight_line['id'] = fabric_item_id;
			default_straight_line['member_id'] = this_member_id;
			default_straight_line['my_type'] = 'line';
			default_straight_line['comment'] = tips[1];
			default_straight_line['backup_opacity'] = 1;
			var currentLine = new fabric.Line([0, 100, 170, 100], default_straight_line);
			this.adding_item = currentLine;
			// console.log('添加直线对象',currentLine);
			break;
		default:
			return;
	}
	// console.log('this.current_click_type',this.current_click_type);
	this.changeAllCanvasSelectState();
	pdfAnnotationUI.changeMouseText();
	// this.saveAllFabricData();
}

pdfwheel.Annotation.prototype.addScreenShotObject = function (text, fabric_item_id, this_member_id) {
	var screenshot_text = new fabric.IText(text, default_screenshot_text);
	screenshot_text['id'] = fabric_item_id + '_text';
	screenshot_text['member_id'] = this_member_id;
	screenshot_text['my_type'] = 'screenshot_text';
	screenshot_text['comment'] = text;
	screenshot_text['selectable'] = true; //禁止选中，也就不可修改文字
	screenshot_text['backup_opacity'] = 1;
	this.adding_screen_shot_text = screenshot_text;


	var screenshot_rect = new fabric.Rect(default_screenshot_rectangle);
	screenshot_rect['id'] = fabric_item_id;
	screenshot_rect['member_id'] = this_member_id;
	screenshot_rect['my_type'] = 'screenshot';
	screenshot_rect['comment'] = text; //截图对象本身保存文字批注
	screenshot_rect['backup_opacity'] = 1;
	this.adding_screen_shot_item = screenshot_rect;

	// fabricObj.add(screenshot_text);
	// fabricObj.add(screenshot_rect);
	// this.saveAllFabricData(); //保存数据
}


pdfwheel.Annotation.prototype.activateAnnotation = function (e, this_node) {
	var id_split = this_node.id.split('-');
	var page_number = id_split[1];
	var anno_id = id_split[3];

	var fabricObj = this.getFabricObj(page_number);
	var fabric_canvas = fabricObj.page_canvas.fabric_canvas_json;
	var items = fabric_canvas.objects;
	var anno_item = {};
	var anno_number = 0;
	for (var i = 0; i < items.length; i++) {
		if (items[i].id == anno_id) {
			// console.log('点击的对象',items[i]);
			anno_item = items[i];
			anno_number = i;
			break;
		}
	}

	var anno_his = this.createOnePageAnnotationForHistory(page_number, anno_number, anno_item);
	// console.log('批注历史',anno_his);


	// console.log('事件',e);
	var his_container = document.getElementById('my_annotation_history');
	his_container.innerHTML = '';
	anno_his.removeAttribute('hidden');
	his_container.appendChild(anno_his);
	// console.log('历史批注',his_container);
	his_container.style.left = e.pageX + 'px';
	his_container.style.top = e.pageY + 20 + 'px';
	his_container.removeAttribute('hidden');
	this.keepInContain(his_container, e);
}

pdfwheel.Annotation.prototype.keepInContain = function (dom, e) {
	const totalHeight = window.innerHeight || document.documentElement.clientHeight;
	const totalWidth = window.innerWidth || document.documentElement.clientWidth;
	// console.log(dom.getBoundingClientRect());
	// 当滚动条滚动时，top, left, bottom, right时刻会发生改变。
	const {
		top,
		right,
		bottom,
		left,
		height,
		width,
	} = dom.getBoundingClientRect();
	//在下方时上移

	if (bottom > totalHeight) {
		dom.style.top = (e.pageY - height - 30) + 'px';
	}

	if (right > totalWidth) {
		dom.style.left = (e.pageX - width - 30) + 'px';
	}
}

pdfwheel.Annotation.prototype.createOnePageAnnotationForHistory = function (page_number, anno_number, anno_item) {
	var tips = {
		'zh-cn': [
			'关闭',
			'复制',
			'删除',
			'注释类型',
			{
				'highlight': '高亮',
				'underline': '下划线',
				'text': '文本',
				'rectangle': '矩形',
				'arrow': '箭头',
				'circle': '圆形',
				'image': '图片',
				'path': '画笔路径',
				'screenshot': '截屏',
				'screenshot_text': '截屏批注',
				'line': '直线',
			},
			'输入注释',
			'保存注释',
			'点击以保存批注',
		],
		'en': [
			'close',
			'copy',
			'delete',
			'annotation type',
			{
				'highlight': 'highlight',
				'underline': 'underline',
				'text': 'text',
				'rectangle': 'rectangle',
				'arrow': 'arrow',
				'circle': 'circle',
				'image': 'image',
				'path': 'path',
				'screenshot': 'screenshot',
				'screenshot_text': 'screenshot comment',
				'line': 'line',
			},
			'input comments',
			'save comments',
			'click to save comments',
			'Add/View Note'
		]
	}[tips_language];

	//批注对象显示的文字
	var anno_text = '';
	if (anno_item.my_type == 'highlight' || anno_item.my_type == 'underline') {
		anno_text = anno_item.text;
	} else {
		anno_text = tips[3] + ' : ' + tips[4][anno_item.my_type];
	}
	var storeddata = false;

	for (var i = 0; i < localStorage.length; i++) {
		var key = localStorage.key(i);

		// Check if the key contains the pattern 'bitstreams'
		if (key.includes(anno_item.id)) {
			storeddata = true;
		}
	}
	var dynamicClass = storeddata ? 'page-annotations-container1' : '';
	var dynamicInstruction = storeddata ? '**This annotation has note' : '';
	var this_annotation = document.createElement('div');
	var inner_html = "<div hidden='true' id='page-" + page_number + "-anno-" + anno_item.id +
		"-container' class='page-annotations-container " + dynamicClass + "'>" +
		"<i title='" + tips[0] +
		"' style='margin-left: 5px;' onclick='closeAnnotationHistory(this)' class='fa fa-times' aria-hidden='true'></i>" +
		"<i title='" + tips[1] +
		"' style='margin-left: 5px;' onclick='copyAnnotation(this)' class='fa fa-clipboard' aria-hidden='true'></i>" +
		"<i title='" + tips[2] +
		"' style='margin-left: 5px;' onclick='deleteAnnotation(this)' class='fa fa-trash' aria-hidden='true'></i>" +
		"<p>" + anno_text + "</p>" +
		"<p id='page-" + page_number + "-anno-" + anno_item.id + "-comment-backup'" +
		" title='" + tips[5] +
		"' contenteditable='true' onfocus='selectcomment(this)' style='padding:3px;background-color: #FFFFFF;margin-top:10px;height:auto;'>" +
		anno_item.comment + "</p>" +
		"<button onclick='saveComment(this)' comment_id='page-" + page_number + "-anno-" + anno_item.id + "-comment-backup'" + "title='" + tips[7] + "' style='margin-top:5px;font-size:15px;'>" + tips[6] + "</button>" +
		"<button onclick='addScatchPadToAnnotation(this)' " + "title='" + tips[7] + "' style='margin-top:5px;margin-left: 13px;font-size:15px;'>" + tips[8] + "</button>" +
		"<p style='margin-top:5px;opacity:0.2;font-weight:600;'><span style='float:left;font-size:3px;'>" +
		anno_item
			.member_id + "</span><span style='float:right;font-size:3px;'>" + pdfAnnotationUI.getDateFromTime(anno_item
				.id.split('_')[
				0]) +
		"</span></p>" +
		"<p style='margin-top:5px;font-weight:300;font-size:10px'>" + dynamicInstruction + "</p>" +
		"</div>";

	this_annotation.innerHTML = inner_html;

	return this_annotation.childNodes[0];
}


//使用构造函数传参
pdfwheel.Highlight = function (cfg) {
	cfg = cfg || {};
	this.tips_language = cfg["tips_language"] || "en";
	this.PDFViewerApplication = cfg["PDFViewerApplication"] || null;
	this.custom_attr = ['id', 'hasControls', 'hasRotatingPoint', 'hasBorders', 'selectable', 'lockMovementX',
		'lockMovementY', 'opacity', 'crossOrigin', 'member_id', 'text', 'my_type', 'comment', 'backup_opacity',
		'lockRotation'
	];
	this.current_member = {
		'id': 'user_1',
		'name': 'member_1',
	};
	this.fabric_annos_id_tag = 'annos-for-page-';
	this.tmp_annotation_data = {};
	this.active_fabric_obj = {
		'page_number': null,
		'active_element': null,
	};
	this.annotation_id = ''; //当前批注id置空
	this.fabric_list = {};
	this.fabric_top = false;
	this.free_draw = false;
	this.start_annotation = false;
	this.stop_process_annotation = false;
	this.stop_touch_highlight = false;
	this.annotation_type = 'highlight';
	this.canvas_sizes = {};
};

pdfwheel.Highlight.prototype.getMouseUpPos = function () {
	var tips = {
		'zh-cn': [
			'不能跨页批注对象，请重新选择',
			'选择对象过多无法批注！',
			'无法批注倾斜文字',
			'选择了过多对象无法完成标注，请重新选择',
		],
		'en': [
			'cross page annotating is not supported!',
			'too many annotating content!',
			'rotate content annotating is not supported!',
			'too many annotating content!',
		]
	}[this.tips_language];

	var sel = window.getSelection();
	if (sel.isCollapsed == true) {
		this.closeCopyConfirm();
		return null;
	};

	if (this.start_annotation == false) {
		if (post_to_parent == true) {
			var select_text = sel.toString();
			window.parent.postMessage({
				"type": 6,
				"source": "pdfjs",
				"content": select_text
			}, '*');
		}

		//弹出选择框
		this.selectionAct();
		return;
	}

	var Range = sel.getRangeAt(0);

	var spans_dict = this.getNewSelSpans(Range);
	for (var data_page_number in spans_dict) {
		var spans = spans_dict[data_page_number];

		if (spans.length > 500) {
			this.cancelSelection(tips[1]);
		} else {
			this.stop_process_annotation = false;
			this.initAnnotation(); //初始化高亮对象

			var highlight_page_id = this.PDFViewerApplication.baseUrl.split("?")[0] + '_page_' + data_page_number;
			this.annotation_id = this.PDFViewerApplication.baseUrl.split("?")[0] + '_page_' + data_page_number;
			//逻辑迁移至viewer.js中，生成页面时即添加id
			// this.addIdForTextLayerSpan(this_page);
			// console.log('当前页面数字',data_page_number);
			var this_page = document.getElementById('page-' + data_page_number);
			text_layer = this_page.getElementsByClassName('textLayer')[0];

			var judge_result = {
				'one_page': true,
				'this_page': this_page,
				'highlight_page_id': highlight_page_id,
				'page_number': data_page_number,
			};

			var highlight_annotations_json = this.processHighlight(judge_result, spans, Range, sel, tips[2]);
			if (this.stop_process_annotation == true) {
				return null;
			}


			// console.log('数据',pdfHighlight);
			pdfAnnotation.saveAnnotationsJson(this.annotation_id, highlight_annotations_json);
			// console.log('主动保存高亮列表');
			pdfAnnotation.addAnnotationToFabric(this.tmp_annotation_data, judge_result.this_page);
			// pdfAnnotation.saveAllFabricData();
			// console.log('主动保存');
			pdfAnnotation.saveFabricCanvas(judge_result.page_number);
			//绘制批注层对象
			var this_annotation_layer = judge_result.this_page.getElementsByClassName('annotationLayer')[0];
			pdfAnnotation.addFabricObjToAnnotationTextLayer(this_annotation_layer);

		}
	}

	//为所有页面内容添加id
	// this.addIdForTextLayerSpanForAllPages();

	// var judge_result = this.judgeOnePage(Range);
	// if (judge_result.one_page == false) {
	// 	this.cancelSelection(tips[0]);
	// 	return null;
	// }

	return {
		'this_page_highlights_data': highlight_annotations_json,
		'this_highlight_data': this.tmp_annotation_data,
		'this_page': judge_result.this_page,
	}
};

pdfwheel.Highlight.prototype.getNewSelSpans = function (Range) {
	var this_frames = Range.cloneContents();
	var new_div = document.createElement('div');
	new_div.appendChild(this_frames);
	var spans = new_div.getElementsByTagName('span');
	var span_page_number;
	var new_spans = {};
	if (spans.length == 0) {
		var select_node = Range.commonAncestorContainer.parentNode;
		span_page_number = select_node.getAttribute('id').split('-')[1];
		new_spans[span_page_number] = [];
	} else {
		for (var i = 0; i < spans.length; i++) {
			if (spans[i].classList[0] != 'markedContent') {
				var span_id = spans[i].getAttribute('id');
				if (span_id == null) {
					continue;
				}
				span_page_number = span_id.split('-')[1];
				if (span_page_number in new_spans) {
					new_spans[span_page_number].push(spans[i]);
				} else {
					new_spans[span_page_number] = [spans[i]];
				}
			}
		}
	}
	return new_spans;
}


pdfwheel.Highlight.prototype.singleHighlightAndUnderline = function (op) {
	var old_start_annotation = this.start_annotation;
	var old_annotation_type = this.annotation_type;

	this.start_annotation = true;
	if (op == 0) {
		this.annotation_type = 'highlight';
	} else {
		this.annotation_type = 'underline';
	}

	var highlight_data = this.getMouseUpPos(); //listen mouseup 监听鼠标抬起

	this.start_annotation = old_start_annotation;
	this.annotation_type = old_annotation_type;
	this.closeCopyConfirm();
}

//initial empty annotation object 初始化空批注对象
pdfwheel.Highlight.prototype.initAnnotation = function () {
	this.tmp_annotation_data = {
		'id': null,
		'page_number': 0,
		'member_id': pdfAnnotation.getRandomMemberID(),
		'save_scale_x': 0,
		'save_scale_y': 0,
		'comment': '',
		'type': '',
		'true_size': [],
		'all_rect': 0,
		'all_str': '',
		'rects': [],
	}
}

pdfwheel.Highlight.prototype.filterRect = function (this_rects, save_scale_x, save_scale_y) {
	var old_scale_x = 2.20125786;
	var old_scale_y = 2.19727891;
	var old_rects = [
		[1.18317609975, 1.9021843523869997, 0.8160738354952829, 0.02488347032121662],
		[1.1402515714800001, 1.9298700666530002, 0.8587150481218062, 0.02488347032121662],
		[1.1402515714800001, 1.9573360530280002, 0.8584689922212806, 0.02488347032121662],
		[1.1402515714800001, 1.9850217672940003, 0.8589459168632076, 0.02488347032121662]
	];

	var result_rect = 0;
	for (var i = 0; i < this_rects.length; i++) {
		var this_rect = this_rects[i];
		for (var j = 0; j < old_rects.length; j++) {
			var this_old_rect = old_rects[j];
		}

	}
}

pdfwheel.Highlight.prototype.filterRect = function (this_rect, old_rect) {

}

pdfwheel.Highlight.prototype.processHighlight = function (judge_result, spans, Range, sel, this_tip) {
	var highlight_annotations_json = this.readAnnotationsForPage(judge_result.highlight_page_id);
	var canvas_sizes = this.getCanvasSize(judge_result.this_page);

	if (spans.length == 0) {
		var single_span = Range.commonAncestorContainer.parentNode;
		this.highlightSpan(single_span, true, Range.startOffset, Range.endOffset,
			false);
	} else {
		this.highlightSpan(spans[0], false, 0, 0, true);
		for (let i = 1; i < spans.length; i++) {
			this.highlightSpan(spans[i], false, 0, 0, false);
		}
	}

	//遇到倾斜对象
	if (this.stop_process_annotation == true) {
		this.cancelSelection(this_tip);
		return;
	}

	var all_str = sel.toString();
	this.tmp_annotation_data.rects = this.joinRects(this.tmp_annotation_data.rects);
	this.addAnnotationData(all_str, judge_result.this_page);
	this.tmp_annotation_data.id = this.buildId(highlight_annotations_json.length + 1);
	highlight_annotations_json.push(this.tmp_annotation_data);
	return highlight_annotations_json;
}

pdfwheel.Highlight.prototype.selectionAct = function () {
	if (this.stop_touch_highlight == true) {
		return;
	};
	var selection = document.getSelection();
	if (selection.isCollapsed == true) {
		return;
	}
	var oRange = selection.getRangeAt(0);
	// const oRect = oRange.getBoundingClientRect();
	//get positioin for selection text rectangle and show operation buttons [highlignt/underline/copy/cancel] in the top of first rectangle
	//获取选择区域的矩形位置，在第一个矩形位置上方显示操作按钮[高亮/下划线/复制/取消]
	var rects = oRange.getClientRects();
	if (rects && rects.length >= 1) {
		var last_rect = rects[0];
		// var last_rect = rects[rects.length - 1];
		this.showCopyConfirm(last_rect.left, last_rect.top - 40);
	}
}

pdfwheel.Highlight.prototype.showCopyConfirm = function (disX, disY) {
	let el = document.getElementById("ff-copyconfirm-btn");
	el.style.left = disX + 'px';
	el.style.top = disY + 'px';
	el.removeAttribute('hidden');
}

//hide operation buttons [highlignt/underline/copy/cancel] 隐藏操作按钮[高亮/下划线/复制/取消]
pdfwheel.Highlight.prototype.closeCopyConfirm = function () {
	let el = document.getElementById("ff-copyconfirm-btn");
	el.style.left = '-50px';
	el.style.top = '-50px';
	el.setAttribute('hidden', true);
	window.getSelection().removeAllRanges();
	document.removeEventListener("selectionchange", endSelectionChangeListen, true);
}

//write annotation data 写入批注数据
pdfwheel.Highlight.prototype.addAnnotationData = function (all_str, this_page) {
	var tips = {
		'zh-cn': [
			'添加批注',
		],
		'en': [
			'add comments',
		]
	}[this.tips_language];

	this.tmp_annotation_data.all_str = all_str; //annotation text
	var all_rect = [];
	if (this.annotation_type == 'highlight') {
		all_rect = this.getGroupRect(this.tmp_annotation_data.rects);
	} else {
		all_rect = this.getGroupRectOfUnderLine(this.tmp_annotation_data.rects);
	}

	this.tmp_annotation_data.member_id = pdfAnnotation.getRandomMemberID();
	this.tmp_annotation_data.true_size = [this.canvas_sizes.true_width, this.canvas_sizes.true_height];
	this.tmp_annotation_data.save_scale_x = this.canvas_sizes.canvas_scale_x;
	this.tmp_annotation_data.save_scale_y = this.canvas_sizes.canvas_scale_y;
	this.tmp_annotation_data.all_rect = all_rect;
	this.tmp_annotation_data.type = this.annotation_type;
	this.tmp_annotation_data.comment = tips[0];
	this.tmp_annotation_data.page_number = parseInt(this_page.getAttribute('data-page-number'));
}

//caculate group rect of all highlight rects 计算所有高亮 rects 的最外围矩形范围
pdfwheel.Highlight.prototype.getGroupRect = function (rects) {
	//Because it's proportional, so min_x,min_y are both going to be less than 2
	//因为是比例，所以min_x,min_y都会比2小
	var min_x = 2,
		min_y = 2,
		max_x = 0,
		max_y = 0;

	for (var i = 0; i < rects.length; i++) {
		var scale_rect = rects[i];
		var box_left = scale_rect[0],
			box_top = scale_rect[1],
			box_width = scale_rect[2],
			box_height = scale_rect[3];

		var this_min_x = box_left,
			this_max_y = box_top + box_height,
			this_max_x = box_left + box_width,
			this_min_y = box_top;

		min_x = Math.min(min_x, this_min_x);
		max_x = Math.max(max_x, this_max_x);
		min_y = Math.min(min_y, this_min_y);
		max_y = Math.max(max_y, this_max_y);
	}

	return [min_x, min_y, max_x - min_x, max_y - min_y];
}

//caculate group rect of all underline rects 计算所有下划线 rects 的最外围矩形范围
pdfwheel.Highlight.prototype.getGroupRectOfUnderLine = function (rects) {
	var min_x = 2,
		min_y = 2,
		max_x = 0,
		max_y = 0;

	for (var i = 0; i < rects.length; i++) {
		var scale_rect = rects[i];
		var x1 = scale_rect[0],
			y1 = scale_rect[1],
			x2 = scale_rect[2],
			y2 = scale_rect[3];

		min_x = Math.min(min_x, x1);
		max_x = Math.max(max_x, x2);
		min_y = Math.min(min_y, y1);
		max_y = Math.max(max_y, y2);
	}

	//The maximum range rectangle is built after the four maximum values are obtained
	//获得到四个最值之后构建最大范围矩形
	return [min_x, min_y, max_x - min_x, max_y - min_y];
}

//join adjacent annotation rectangles   合并相邻的批注矩形
pdfwheel.Highlight.prototype.joinRects = function (old_rects) {
	// [scale_left, scale_top, scale_width, scale_height];
	var rect_dict_list = [];

	if (this.annotation_type == 'highlight') {
		for (var i = 0; i < old_rects.length; i++) {
			var this_rect = old_rects[i];
			rect_dict_list = this.addRectToRectDictHighlight(this_rect, rect_dict_list, i);
		}
	} else {
		for (var i = 0; i < old_rects.length; i++) {
			var this_rect = old_rects[i];
			rect_dict_list = this.addRectToRectDictUnderline(this_rect, rect_dict_list, i);
		}
	}

	//new rects after joining 合并后的新列表
	var new_rects = [];
	for (var j = 0; j < rect_dict_list.length; j++) {
		new_rects.push(rect_dict_list[j]['uni_rect']);
	}
	return new_rects;
}

pdfwheel.Highlight.prototype.highlightSpan = function (span, single_span, start_offset, end_offset, first_span) {
	var ctx = this.canvas_sizes.ctx;
	var true_width = this.canvas_sizes.true_width;
	var true_height = this.canvas_sizes.true_height;
	var canvas_scale_x = this.canvas_sizes.canvas_scale_x;
	var canvas_scale_y = this.canvas_sizes.canvas_scale_y;
	var canvas_text_scale_x = this.canvas_sizes.canvas_text_scale_x;
	var canvas_text_scale_y = this.canvas_sizes.canvas_text_scale_y;

	var this_style = span.style;

	var left = 0.0;
	var top = 0.0;

	if (this_style.left.indexOf('%') != -1) {
		left = this.getNumberFromStyle(this_style.left, '%') * canvas_scale_x * true_width / 100; //原本是百分比，需要变回长度
	} else {
		//px数值
		left = this.getNumberFromStyle(this_style.left, 'px') * canvas_scale_x * canvas_text_scale_x;
	}


	if (this_style.top.indexOf('%') != -1) {
		top = this.getNumberFromStyle(this_style.top, '%') * canvas_scale_y * true_height / 100; //原本是百分比，需要变回长度
	} else {
		top = this.getNumberFromStyle(this_style.top, 'px') * canvas_scale_y * canvas_text_scale_y;
	}

	var height = this.getNumberFromStyle(this_style.fontSize, 'px') * canvas_text_scale_y * canvas_scale_y,
		offset_width = 0.0,
		width = 0.0,
		start_offset_str = '',
		metrics = '';

	var transform_list = this_style.transform.split(' ');
	var rotate = 0; //rotate angle 旋转角度
	var scaleX = 1;
	if (transform_list.length == 2) {
		//stop annoataion if there is annotation object 有旋转对象时终止批注
		rotate = parseFloat(transform_list[0].replace('rotate(', '').replace('deg)', ''));
		scaleX = parseFloat(transform_list[1].replace('scaleX(', '').replace(')', ''));
		this.stop_process_annotation = true;
		return;
	} else {
		scaleX = parseFloat(this_style.transform.replace('scaleX(', '').replace(')', ''));
	}

	var this_font = height + 'px' + " " + this_style.fontFamily;
	ctx.font = this_font;

	if (first_span == true) {
		var true_span = document.getElementById(span.getAttribute('id'));
		start_offset_str = true_span.innerText.replace(span.innerText, '');
		offset_width = ctx.measureText(start_offset_str).width;
	}

	if (single_span) {
		start_offset_str = span.innerText.slice(0, start_offset);
		offset_width = ctx.measureText(start_offset_str).width;
		metrics = ctx.measureText(span.innerText.slice(start_offset, end_offset));
	} else {
		metrics = ctx.measureText(span.innerText);
	}

	width = metrics.width;
	if (scaleX) {
		width = width * scaleX.toFixed(3);
		offset_width = offset_width * scaleX.toFixed(3);
	}

	//add current annotation relative position in page to page annotation list 添加当前批注相对位置到批注列表
	if (this.annotation_type == 'highlight') {
		this.drawRect(ctx, left, offset_width, top, width, height);
	} else {
		this.drawLine(ctx, left, offset_width, top, width, height);
	}
}

pdfwheel.Highlight.prototype.drawRect = function (ctx, left, offset_width, top, width, height) {
	var true_width = this.canvas_sizes.true_width;
	var true_height = this.canvas_sizes.true_height;

	var scale_left = (left + offset_width) / true_width.toFixed(8),
		scale_top = top / true_height.toFixed(8),
		scale_width = width / true_width.toFixed(8),
		scale_height = height / true_height.toFixed(8);

	var scale_rect = [scale_left, scale_top, scale_width, scale_height];
	this.tmp_annotation_data.rects.push(scale_rect);
};

pdfwheel.Highlight.prototype.drawLine = function (ctx, left, offset_width, top, width, height) {
	var true_width = this.canvas_sizes.true_width;
	var true_height = this.canvas_sizes.true_height;

	var x1 = left + offset_width,
		y1 = top + height,
		x2 = left + offset_width + width,
		y2 = top + height;

	this.tmp_annotation_data.rects.push([x1 / true_width, y1 / true_height, x2 / true_width, y2 / true_height]);
};

//join two highlight rectangle 合并两个高亮矩形对象
pdfwheel.Highlight.prototype.addRectToRectDictHighlight = function (this_rect, rect_dict_list, this_index) {
	if (rect_dict_list.length == 0) {
		rect_dict_list.push({
			'scale_top': this_rect[1],
			'scale_height': this_rect[3],
			'uni_rect': this_rect,
			'index': this_index,
		});
		return rect_dict_list;
	}
	//Compare the starting top and height, and merge the starting left and width if they are equal 比对起始top和高度，两者相等时合并起始的左边和宽度
	for (var i = 0; i < rect_dict_list.length; i++) {
		var rect_dict = rect_dict_list[i];

		//起始top和height都相等，合并两个区域,判断两个rect是否相邻
		// if (this_rect[1]==rect_dict['scale_top'] && this_rect[3]==rect_dict['scale_height'] && this_index==(rect_dict['index']+1)){
		// 	var new_rect=uniTwoRect(rect_dict['uni_rect'],this_rect);
		// 	rect_dict_list[i]['uni_rect']=new_rect;
		// 	rect_dict_list[i]['index']=this_index;
		// 	return rect_dict_list; 
		// }

		//do not judge whether two RECts are adjacent 不判断两个rect是否相邻
		if (this_rect[1] == rect_dict['scale_top'] && this_rect[3] == rect_dict['scale_height']) {
			var new_rect = this.uniTwoRect(rect_dict['uni_rect'], this_rect);
			rect_dict_list[i]['uni_rect'] = new_rect;
			rect_dict_list[i]['index'] = this_index;
			return rect_dict_list;
		}
	}

	//add new rect_list if they don't have equal left and height 宽高都不相等则新增
	rect_dict_list.push({
		'scale_top': this_rect[1],
		'scale_height': this_rect[3],
		'uni_rect': this_rect,
		'index': this_index,
	});

	return rect_dict_list;
}

//join two udnerline rectangle 合并两个下划线矩形对象
pdfwheel.Highlight.prototype.addRectToRectDictUnderline = function (this_rect, rect_dict_list, this_index) {
	if (rect_dict_list.length == 0) {
		rect_dict_list.push({
			'x1': this_rect[0],
			'y1': this_rect[1],
			'uni_rect': this_rect,
			'index': this_index,
		});
		return rect_dict_list;
	}
	//Compare the starting top and height, and merge the starting left and width if they are equal 比对起始top和高度，两者相等时合并起始的左边和宽度
	for (var i = 0; i < rect_dict_list.length; i++) {
		var rect_dict = rect_dict_list[i];

		//judge whether two RECts are adjacent 判断两个rect是否相邻
		if (this_rect[1] == rect_dict['y1'] && this_index == (rect_dict['index'] + 1)) {
			rect_dict_list[i]['uni_rect'] = [rect_dict['x1'], rect_dict['y1'], this_rect[2], this_rect[3]];
			rect_dict_list[i]['index'] = this_index;
			return rect_dict_list;
		}
	}

	//add new rect_list if they don't have equal left and height 宽高都不相等则新增
	rect_dict_list.push({
		'x1': this_rect[0],
		'y1': this_rect[1],
		'uni_rect': this_rect,
		'index': this_index,
	});

	return rect_dict_list;
}

// join two rect position 合并两个矩形的坐标
pdfwheel.Highlight.prototype.uniTwoRect = function (rect_one, rect_two) {
	var scale_left = Math.min.apply(null, [rect_one[0], rect_two[0]]);
	var scale_width = rect_two[0] + rect_two[2] - rect_one[0];
	var new_rect = [scale_left, rect_one[1], scale_width, rect_one[3]];
	return new_rect;
}

pdfwheel.Highlight.prototype.getCanvasSize = function (this_page) {
	var canvasWrapper = this_page.getElementsByClassName('canvasWrapper')[0];
	var text_canvas = canvasWrapper.getElementsByTagName('canvas')[0];
	var ctx = text_canvas.getContext("2d");

	//initial empty annotation object 初始化空标注对象
	// initAnnotation();
	var true_width = this.getNumberFromStyle(text_canvas.style.width, 'px');
	var true_height = this.getNumberFromStyle(text_canvas.style.height, 'px');

	var text_layer_width = this.getNumberFromStyle(text_layer.style.width, 'px');
	var text_layer_height = this.getNumberFromStyle(text_layer.style.height, 'px');

	var canvas_scale_x = (text_canvas.width / true_width).toFixed(8);
	var canvas_scale_y = (text_canvas.height / true_height).toFixed(8);

	var canvas_text_scale_x = (true_width / text_layer_width).toFixed(8);
	var canvas_text_scale_y = (true_height / text_layer_height).toFixed(8);


	this.canvas_sizes = {
		'ctx': ctx,
		'true_width': true_width,
		'true_height': true_height,
		'text_layer_width': text_layer_width,
		'text_layer_height': text_layer_height,
		'canvas_scale_x': canvas_scale_x,
		'canvas_scale_y': canvas_scale_y,
		'canvas_text_scale_x': canvas_text_scale_x,
		'canvas_text_scale_y': canvas_text_scale_y,
	};
}

pdfwheel.Highlight.prototype.getNumberFromStyle = function (str_value, replace_str) {
	var re_text = str_value.replace(' ', '').replace('calc(var(--scale-factor)*', '').replace(replace_str + ')',
		'');
	var value = parseFloat(re_text);
	return value;
}

pdfwheel.Highlight.prototype.readAnnotationsForPage = function (annotation_id) {
	var this_page_annotation = [];
	if (localStorage.getItem(annotation_id) !== null) {
		this_page_annotation = JSON.parse(localStorage.getItem(annotation_id));
		for (var i = 0; i < this_page_annotation.length; i++) {
			if (Object.prototype.hasOwnProperty.call(this_page_annotation[i], 'id') == false ||
				this_page_annotation[i]
					.id == null) {
				this_page_annotation[i].id = this.buildId(i + 1);
			}
		}
	}
	return this_page_annotation;
}

pdfwheel.Highlight.prototype.buildId = function (id_number) {
	var this_time = new Date().getTime();
	var id = this_time + '_' + id_number;
	return id;
}

pdfwheel.Highlight.prototype.cancelSelection = function (this_tip) {
	alert(this_tip);
	window.getSelection().removeAllRanges();
}

pdfwheel.Highlight.prototype.closeCopyConfirm = function () {
	let el = document.getElementById("ff-copyconfirm-btn");
	el.style.left = '-50px';
	el.style.top = '-50px';
	el.setAttribute('hidden', true);
	window.getSelection().removeAllRanges();
	// document.removeEventListener("selectionchange", endSelectionChangeListen, true);
}

pdfwheel.Highlight.prototype.judgeOnePage = function (Range) {
	if (Range.commonAncestorContainer.nodeType != 3 && Range.commonAncestorContainer.getAttribute('id') ==
		'viewer') {
		return {
			'one_page': false,
			'this_page': null,
			'highlight_page_id': null,
			'page_number': null,
		};
	}

	var this_page = null;
	if (Range.commonAncestorContainer.nodeType == 3) {
		this_page = Range.commonAncestorContainer.parentElement;
	} else {
		this_page = Range.commonAncestorContainer;
	}


	var data_page_number = this_page.getAttribute('data-page-number');
	while (data_page_number == null) {
		this_page = this_page.parentElement;
		data_page_number = this_page.getAttribute('data-page-number');
	}

	text_layer = this_page.getElementsByClassName('textLayer')[0];

	var highlight_page_id = this.PDFViewerApplication.baseUrl.split("?")[0] + '_page_' + data_page_number;
	this.annotation_id = this.PDFViewerApplication.baseUrl.split("?")[0] + '_page_' + data_page_number;
	//逻辑迁移至viewer.js中，生成页面时即添加id
	// this.addIdForTextLayerSpan(this_page);
	return {
		'one_page': true,
		'this_page': this_page,
		'highlight_page_id': highlight_page_id,
		'page_number': data_page_number,
	};
};

pdfwheel.Highlight.prototype.getSelSpans = function (Range) {
	var this_frames = Range.cloneContents();
	var new_div = document.createElement('div');
	new_div.appendChild(this_frames);
	var spans = new_div.getElementsByTagName('span');

	if (spans.length == 0) {
		return spans;
	} else {
		var new_spans = [];
		for (var i = 0; i < spans.length; i++) {
			if (spans[i].classList[0] != 'markedContent') {
				new_spans.push(spans[i]);
			}
		}
		return new_spans;
	}
};

pdfwheel.Highlight.prototype.addIdForTextLayerSpanForAllPages = function (page_div) {
	var all_pages = document.getElementsByClassName('page');
	for (var i = 0; i < all_pages.length; i++) {
		this_page = all_pages[i];
		if (this_page.hasAttribute('added_id') == false) {
			this.addIdForTextLayerSpan(this_page);
			this_page.setAttribute('added_id', true);
		}
	}
}

pdfwheel.Highlight.prototype.addIdForTextLayerSpan = function (page_div) {
	var page_number = page_div.getAttribute('data-page-number');
	page_div.setAttribute('id', 'page-' + page_number);
	var text_layer = page_div.getElementsByClassName('textLayer')[0];
	if (text_layer == null) {
		return;
	}

	// console.log('text_layer',text_layer);

	var spans = text_layer.getElementsByTagName('span');
	if (spans.length == 0) {
		return;
	}

	// if (page_number==4){
	// 	console.log('spans',spans);
	// }
	for (var i = 0; i < spans.length; i++) {
		if (spans[i].hasAttribute('id') == false) {
			var span_id = 'page-' + page_number + '-textspan-' + (i + 1);
			spans[i].setAttribute('id', span_id);
		}
	}
};


//使用构造函数传参
pdfwheel.UI = function (cfg) {
	cfg = cfg || {};
	this.tips_language = cfg["tips_language"] || "en";
	this.PDFViewerApplication = cfg["PDFViewerApplication"] || null;
	this.last_click_node_id = '';
	this.filter_member_delete = false;
	this.show_annotation_list = false;
	this.current_member = {
		'id': 'user_1',
		'name': 'member_1',
	};
	this.fabric_annos_id_tag = 'annos-for-page-';
	this.current_mouse_text = 'mouse text';
	this.touchState = null;

	this.verticalImg = '../annotation/svgs/middlecontrol.svg';
	this.horizontalImg = '../annotation/svgs/middlecontrolhoz.svg';
	this.edgeImg = '../annotation/svgs/edgecontrol.svg';
	this.rotateImg = '../annotation/svgs/rotateicon.svg';

	this.annotation_list_ids = [];
	this.draw_connect = false; //绘制连线
}


// 中间横杠
pdfwheel.UI.prototype.intervalControl = function () {
	const verticalImgIcon = document.createElement('img');
	verticalImgIcon.src = this.verticalImg;

	const horizontalImgIcon = document.createElement('img');
	horizontalImgIcon.src = this.horizontalImg;

	function renderIcon(ctx, left, top, styleOverride, fabricObject) {
		const wsize = 20;
		const hsize = 25;
		ctx.save();
		ctx.translate(left, top);
		ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
		ctx.drawImage(verticalImgIcon, -wsize / 2, -hsize / 2, wsize, hsize);
		ctx.restore();
	}

	function renderIconHoz(ctx, left, top, styleOverride, fabricObject) {
		const wsize = 25;
		const hsize = 20;
		ctx.save();
		ctx.translate(left, top);
		ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
		ctx.drawImage(horizontalImgIcon, -wsize / 2, -hsize / 2, wsize, hsize);
		ctx.restore();
	}
	// 中间横杠
	fabric.Object.prototype.controls.ml = new fabric.Control({
		x: -0.5,
		y: 0,
		offsetX: -1,
		cursorStyleHandler: fabric.controlsUtils.scaleSkewCursorStyleHandler,
		actionHandler: fabric.controlsUtils.scalingXOrSkewingY,
		getActionName: fabric.controlsUtils.scaleOrSkewActionName,
		render: renderIcon,
	});

	fabric.Object.prototype.controls.mr = new fabric.Control({
		x: 0.5,
		y: 0,
		offsetX: 1,
		cursorStyleHandler: fabric.controlsUtils.scaleSkewCursorStyleHandler,
		actionHandler: fabric.controlsUtils.scalingXOrSkewingY,
		getActionName: fabric.controlsUtils.scaleOrSkewActionName,
		render: renderIcon,
	});

	fabric.Object.prototype.controls.mb = new fabric.Control({
		x: 0,
		y: 0.5,
		offsetY: 1,
		cursorStyleHandler: fabric.controlsUtils.scaleSkewCursorStyleHandler,
		actionHandler: fabric.controlsUtils.scalingYOrSkewingX,
		getActionName: fabric.controlsUtils.scaleOrSkewActionName,
		render: renderIconHoz,
	});

	fabric.Object.prototype.controls.mt = new fabric.Control({
		x: 0,
		y: -0.5,
		offsetY: -1,
		cursorStyleHandler: fabric.controlsUtils.scaleSkewCursorStyleHandler,
		actionHandler: fabric.controlsUtils.scalingYOrSkewingX,
		getActionName: fabric.controlsUtils.scaleOrSkewActionName,
		render: renderIconHoz,
	});
}

// 顶点
pdfwheel.UI.prototype.peakControl = function () {
	const img = document.createElement('img');
	img.src = this.edgeImg;

	function renderIconEdge(ctx, left, top, styleOverride, fabricObject) {
		const wsize = 25;
		const hsize = 25;
		ctx.save();
		ctx.translate(left, top);
		ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
		ctx.drawImage(img, -wsize / 2, -hsize / 2, wsize, hsize);
		ctx.restore();
	}
	// 四角图标
	fabric.Object.prototype.controls.tl = new fabric.Control({
		x: -0.5,
		y: -0.5,
		cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
		actionHandler: fabric.controlsUtils.scalingEqually,
		render: renderIconEdge,
	});
	fabric.Object.prototype.controls.bl = new fabric.Control({
		x: -0.5,
		y: 0.5,
		cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
		actionHandler: fabric.controlsUtils.scalingEqually,
		render: renderIconEdge,
	});
	fabric.Object.prototype.controls.tr = new fabric.Control({
		x: 0.5,
		y: -0.5,
		cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
		actionHandler: fabric.controlsUtils.scalingEqually,
		render: renderIconEdge,
	});
	fabric.Object.prototype.controls.br = new fabric.Control({
		x: 0.5,
		y: 0.5,
		cursorStyleHandler: fabric.controlsUtils.scaleCursorStyleHandler,
		actionHandler: fabric.controlsUtils.scalingEqually,
		render: renderIconEdge,
	});
}
// 删除
pdfwheel.UI.prototype.deleteControl = function () {
	const deleteIcon =
		"data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";
	const delImg = document.createElement('img');
	delImg.src = deleteIcon;

	function renderDelIcon(ctx, left, top, styleOverride, fabricObject) {
		const size = this.cornerSize;
		ctx.save();
		ctx.translate(left, top);
		ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
		ctx.drawImage(delImg, -size / 2, -size / 2, size, size);
		ctx.restore();
	}

	// 删除选中元素
	function deleteObject() {
		pdfAnnotation.delEl();
	}

	// 删除图标
	fabric.Object.prototype.controls.deleteControl = new fabric.Control({
		x: 0.5,
		y: -0.5,
		offsetY: -16,
		offsetX: 16,
		cursorStyle: 'pointer',
		mouseUpHandler: deleteObject,
		render: renderDelIcon,
		cornerSize: 24,
	});
}

// 旋转
pdfwheel.UI.prototype.rotationControl = function () {
	const img = document.createElement('img');
	img.src = this.rotateImg;

	function renderIconRotate(ctx, left, top, styleOverride, fabricObject) {
		const wsize = 40;
		const hsize = 40;
		ctx.save();
		ctx.translate(left, top);
		ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
		ctx.drawImage(img, -wsize / 2, -hsize / 2, wsize, hsize);
		ctx.restore();
	}
	// 旋转图标
	fabric.Object.prototype.controls.mtr = new fabric.Control({
		x: 0,
		y: 0.5,
		cursorStyleHandler: fabric.controlsUtils.rotationStyleHandler,
		actionHandler: fabric.controlsUtils.rotationWithSnapping,
		offsetY: 30,
		hasBorders: true,
		withConnecton: false,
		actionName: 'rotate',
		render: renderIconRotate,
	});
}

pdfwheel.UI.prototype.initControls = function (canvas) {
	this.deleteControl();
	this.peakControl();
	this.intervalControl();
	// this.rotationControl();

	// 选中样式
	fabric.Object.prototype.set({
		transparentCorners: false,
		borderColor: '#51B9F9',
		// borderColor: 'red',
		cornerColor: '#FFF',
		borderScaleFactor: 2.5,
		hasBorders: true,
		// cornerStyle: 'circle',
		cornerStrokeColor: '#0E98FC',
		borderOpacityWhenMoving: 1,
	});
}


//click left annotation buttons 点击左侧批注按钮
pdfwheel.UI.prototype.clickTab = function (node) {
	//cancel seletion close annotation 取消选择，关闭注释
	if (this.last_click_node_id == node.id && pdfHighlight.start_annotation == true) {
		node.getElementsByTagName('i')[0].classList.remove('button-active');
		pdfHighlight.start_annotation = false;
		return;
	}

	//取消橡皮笔刷
	if (this.last_click_node_id == node.id && pdfAnnotation.eraser_brush == true) {
		node.getElementsByTagName('i')[0].classList.remove('button-active');
		this.setFabricCanvasContainerZIndex(10);
		pdfAnnotation.eraser_brush = false;
		return;
	}

	pdfHighlight.start_annotation = true;
	this.setFabricCanvasContainerZIndex(10);

	node.getElementsByTagName('i')[0].classList.add('button-active');
	this.last_click_node_id = node.id;
	var buttons = document.getElementById('firefly-annotation-buttons').getElementsByTagName('button');
	for (const button of buttons) {
		if (button.id !== node.id) {
			// console.log('当前Id',button.id);
			button.getElementsByTagName('i')[0].classList.remove('button-active');
		}
	}

	switch (node.id) {
		case "ff-highlight-btn":
			pdfHighlight.annotation_type = 'highlight';
			break;

		case "ff-underline-btn":
			pdfHighlight.annotation_type = 'underline';
			break;
		case "ff-edit-btn":
			break;

		case "ff-upload-btn":
			break;
		case "ff-eraser-btn":
			eraserTool(node);
			break;

		default:
			return;
	}
}

//Sets the layer display level 设置图层的显示级别
pdfwheel.UI.prototype.setFabricCanvasContainerZIndex = function (z_index) {
	var fabs = document.getElementsByClassName('canvas-container');
	for (const fab of fabs) {
		fab.style.zIndex = z_index;
	}

	if (z_index == 10) {
		pdfAnnotation.fabric_top = false;
		pdfAnnotation.free_draw = false;
		this.disActivateFreeDraw();
		pdfAnnotation.hiddenMenu(); //取消选中的元素
	} else {
		pdfHighlight.start_annotation = false;
		this.cancelAllAnnotationButtons({
			'id': 'no_id'
		});
	}
}

//deactivate all buttons color 取消其他所有按钮的颜色
pdfwheel.UI.prototype.cancelAllAnnotationButtons = function (node) {
	var buttons = document.getElementById('firefly-annotation-buttons').getElementsByTagName('button');
	for (const button of buttons) {
		if (button.id !== node.id) {
			//如果点击的是橡皮擦，那么不用取消颜色
			if (pdfAnnotation.eraser_brush == true && button.id == "ff-eraser-btn") {
				var a = 5;
			} else {
				button.getElementsByTagName('i')[0].classList.remove('button-active');
			}
		}
	}
}

// deactivate free draw 关闭绘图模式
pdfwheel.UI.prototype.disActivateFreeDraw = function () {
	for (var key in pdfAnnotation.fabric_list) {
		pdfAnnotation.fabric_list[key].page_canvas.fabric_canvas.isDrawingMode = pdfAnnotation.free_draw;
	}

	//同时隐藏改变画笔的颜色
	var draw_node = document.getElementById('ff-hor-free-draw');
	if (draw_node) {
		draw_node.getElementsByTagName('i')[0].classList.remove('button-active');
		draw_node.getElementsByTagName('span')[0].classList.remove('button-active');
	}
}

//set Fabric layer to top   将 Fabric 层设置为页面最顶层
pdfwheel.UI.prototype.setFabricTop = function (node) {
	// cancelOtherButton(node);
	// console.log('fabric_top',fabric_top);
	if (pdfAnnotation.fabric_top == false) {
		this.setFabricCanvasContainerZIndex(100);
		pdfAnnotation.fabric_top = true;
		node.getElementsByTagName('i')[0].classList.add('button-active');
		node.getElementsByTagName('span')[0].classList.add('button-active');

		pdfAnnotation.free_draw = false;
		this.disActivateFreeDraw(); //deactivate draw mode 关闭绘图模式
	} else {
		pdfAnnotation.fabric_top = false;
		this.setFabricCanvasContainerZIndex(10);
		node.getElementsByTagName('i')[0].classList.remove('button-active');
		node.getElementsByTagName('span')[0].classList.remove('button-active');
	}
}

//deactivate button color 取消按钮的颜色
pdfwheel.UI.prototype.cancelOtherButton = function (node) {
	var buttons = document.getElementById('firefly-annotation-buttons').getElementsByTagName('button');
	for (const button of buttons) {
		if (button.id !== node.id) {
			button.getElementsByTagName('i')[0].classList.remove('button-active');
		}
	}
}

pdfwheel.UI.prototype.showAnnotationList = function () {
	document.getElementById('annotations_list').removeAttribute('hidden');
	var this_file_annotations = pdfAnnotation.readFileAnnotations();
	this.annotation_list_ids = []; //置空列表id
	this.createAnnotation(this_file_annotations);
	//创建列表之后要打开最后一个被关闭的按钮

	if (last_connect_id == '-1') {
		if (Object.keys(this_file_annotations).length > 0) {
			var firstKey = Object.keys(this_file_annotations)[0];
			var page_number = firstKey.split('-')[3];
			last_connect_id = 'page-' + page_number + '-anno-open';
		};
	}

	//刷新时绘制之前的连接线
	if (Object.keys(this_file_annotations).length > 0) {
		this.showLink();
	}
}

pdfwheel.UI.prototype.openOrCloseAnnotation = function (node) {
	var id_split = node.id.split('-');
	//修改页面的展开状态
	var this_page_key = this.fabric_annos_id_tag + id_split[1];
	if (id_split[id_split.length - 1] == 'close') {
		document.getElementById(node.id.replace('close', 'open')).removeAttribute('hidden');
		this.openAnnotations(node, false);
		show_state[id_split[1]] = false; //刷新时默认打开页面

		JSplump.clearAllAnnotations(node.id); //删除批注连接线
	} else {
		show_state[id_split[1]] = true; //刷新时默认关闭页面
		document.getElementById(node.id.replace('open', 'close')).removeAttribute('hidden');
		this.openAnnotations(node, true);
		if (this.draw_connect == true) {
			JSplump.draw_connect = true;
			JSplump.connectAllAnnotations(node.id); //绘制批注连接线

			//绘制批注链接线时记录id，后面刷新时自动重新链接
			last_connect_id = node.id;
		}
	}
	// console.log('列表展开情况',show_state);
	node.setAttribute('hidden', 'true');
}

pdfwheel.UI.prototype.hiddenAnnotationList = function () {
	document.getElementById('annotations_list').setAttribute('hidden', true);
}


//create annotation html elements list for showing 生成展示用的批注html列表元素
pdfwheel.UI.prototype.createAnnotation = function (this_file_annotations) {
	var tips = {
		'zh-cn': [
			'关闭列表',
			'显示连接线',
			'展开某页批注列表时显示连接线',
		],
		'en': [
			'Close List',
			'Show Connection',
			'show connection line when show some page annotation list',
		]
	}[tips_language];

	var annotation_list_node = document.getElementById('annotations_list');
	annotation_list_node.innerHTML = ''; //clear children 清空所有子元素


	var parent_button = document.createElement('button'); // add hidden button 增加关闭按钮
	var outer_html = '';
	if (this.draw_connect == true) {
		outer_html =
			'<div class="closeAnnotationListDiv">' +

			'<div><button style="border:none;" title="close list" id="ff-close-btn" onclick="editAnnotation()" type="button"><span>' +
			tips[0] +
			'</span><i class="fa fa-times-circle" style="margin-left: 5px;" aria-hidden="true"></i></button>' +
			'</div></div>';
	} else {
		outer_html =
			'<div class="closeAnnotationListDiv">' +

			'<div><button style="border:none;" title="close list" id="ff-close-btn" onclick="editAnnotation()" type="button"><span>' +
			tips[0] +
			'</span><i class="fa fa-times-circle" style="margin-left: 5px;" aria-hidden="true"></i></button>' +
			'</div></div>';
	}

	parent_button.innerHTML = outer_html;
	annotation_list_node.appendChild(parent_button.childNodes[0]);

	//显示列表
	this.addAnnotationListHtml(this_file_annotations, annotation_list_node);
}

pdfwheel.UI.prototype.openOrCloseLink = function (node) {
	if (node.checked == false) {
		//隐藏批注列表
		// console.log('关闭列表');
		this.draw_connect = false;
		JSplump.draw_connect = false;
		JSplump.clearJsPlump();
	} else {
		//显示批注列表
		// console.log('打开列表');
		this.draw_connect = true;
		this.showLink();
	}

}

pdfwheel.UI.prototype.showLink = function () {
	//刷新时如果显示了列表则绘制连接线
	if (last_connect_id != '-1' && this.draw_connect && this.show_annotation_list) {
		JSplump.clearJsPlump();
		JSplump.connectAllAnnotations(last_connect_id); //绘制批注连接线
	}
}

pdfwheel.UI.prototype.createElemetsCarryAttribute = function (tag, attr_dict) {
	var this_el = document.createElement(tag);
	for (var key in attr_dict) {
		this_el.setAttribute(key, attr_dict[key]);
	}
	return this_el;

}

pdfwheel.UI.prototype.applyShowState = function (show_list) {
	if (show_list == false) {
		hidden_container = "hidden='true'";
		hidden_open = "hidden='true'";
		hidden_close = "";
	} else {
		hidden_close = "hidden='true'";
		hidden_open = "";
		hidden_container = "";
	}
}

pdfwheel.UI.prototype.addAnnotationListHtml = function (this_file_annotations, annotation_list_node) {
	if (this.show_all_annotation_list == false) {
		// console.log('为假不显示列表');
		return;
	}
	// console.log('列表展开情况',show_state);
	var pure_annotation_div = this.createElemetsCarryAttribute('div', {
		'id': 'my-pure-annotations-container',
	});
	pure_annotation_div.style.marginTop = '40px';

	// console.log('显示列表dfad',this_file_annotations);

	for (var key in this_file_annotations) {
		// console.log('key', key);
		var page_number_str = key.split('-')
		var i = parseInt(page_number_str[page_number_str.length - 1]) - 1;
		// var this_page_annotation = this_file_annotations[key]['page_annotations'];
		var this_page_all_annotation = this_file_annotations[key]['page_canvas']['fabric_canvas_json']['objects'];
		// console.log(i,this_page_annotation);
		//根据选中的用户id需要再过滤一遍
		var this_page_annotation = this_page_all_annotation;

		//是否默认展开列表
		var str_page_number = (i + 1).toString();
		if (!(str_page_number in show_state)) {
			show_state[str_page_number] = default_show_onepage_annotation_list;
		}
		this.applyShowState(show_state[str_page_number]);

		var page_annotation_container = document.createElement('div');
		page_annotation_container.setAttribute('class', 'page-annotations');

		if (this_page_annotation.length > 0) {
			var page_annotation_title = this.createPageAnnotationTitle(i + 1, this_page_annotation.length);
			page_annotation_container.appendChild(page_annotation_title);

			//按页存储批注id 页码是i+1
			this.annotation_list_ids['page-' + (i + 1)] = [];

			//add specifical annotation text 添加具体标注内容
			for (var j = 0; j < this_page_annotation.length; j++) {
				var this_annotation = this.createOnePageAnnotation(i + 1, j + 1, this_page_annotation[j]);
				page_annotation_container.appendChild(this_annotation);
			}

			pure_annotation_div.appendChild(page_annotation_container);
		}
	}
	annotation_list_node.appendChild(pure_annotation_div);
}

//create page annotation title for showing 创建展示用的页面批注title
pdfwheel.UI.prototype.createPageAnnotationTitle = function (page_number, anno_count) {
	var tips = {
		'zh-cn': [
			'第 ',
			' 页-共 ',
			' 项',
			'收起',
			'展开',
			'清空当前页面所有注释',
			'显示当前页面连接线，仅当 “显示链接线” 按钮勾选时可用',
		],
		'en': [
			'page ',
			'-',
			' annotations',
			'hide',
			'show',
			'clear all annotations of this page',
			'show connect link of this link, only avaliable when "show connection cheked"',
		]
	}[tips_language];

	var page_annotations_title = document.createElement('div');


	var outer_html = "<div id='page-" + page_number + "-anno-title' class='page-annotations-title'>" +
		"<div><i id='page-" + page_number +
		"-anno-close' onclick='openOrCloseAnnotation(this)' " + hidden_open + " title='" + tips[3] +
		"' class='fa fa-minus-square' aria-hidden='true'></i>" +
		"<i id='page-" + page_number +
		"-anno-open' onclick='openOrCloseAnnotation(this)' " + hidden_close + " title='" + tips[4] +
		"' class='fa fa-plus-square' aria-hidden='true'></i>" +
		"<p style='font-size:13px;' id='page-" + page_number + "-anno-title-p'>" +
		tips[0] + page_number + tips[1] + anno_count + tips[2] +
		"</p></div>" +
		"<div><i id='page-" + page_number +
		"-anno-link' onclick='showThisPageLink(this)' title='" + tips[6] +
		"' class='fa fa-link' aria-hidden='true'></i><i id='page-" + page_number +
		"-anno-clear' onclick='clearPageAnnotations(this)' title='" + tips[5] +
		"' class='fa fa-trash' aria-hidden='true'></i></div>" +
		"</div>";
	page_annotations_title.innerHTML = outer_html;
	return page_annotations_title.childNodes[0];
}

//create page annotation for showing 创建展示用的页面批注
pdfwheel.UI.prototype.createOnePageAnnotation = function (page_number, anno_number, anno_item) {
	var tips = {
		'zh-cn': [
			'删除',
			'复制',
			'跳转',
			'注释类型',
			{
				'highlight': '高亮',
				'underline': '下划线',
				'text': '文本',
				'rectangle': '矩形',
				'arrow': '箭头',
				'circle': '圆形',
				'image': '图片',
				'path': '画笔路径',
				'screenshot': '截屏',
				'screenshot_text': '截屏批注',
				'line': '直线',
			},
			'输入注释',
			'保存注释',
			'点击以保存批注',
		],
		'en': [
			'delete',
			'copy',
			'goto',
			'annotation type',
			{
				'highlight': 'highlight',
				'underline': 'underline',
				'text': 'text',
				'rectangle': 'rectangle',
				'arrow': 'arrow',
				'circle': 'circle',
				'image': 'image',
				'path': 'path',
				'screenshot': 'screenshot',
				'screenshot_text': 'screenshot comment',
				'line': 'line',
			},
			'input comments',
			'save comments',
			'click to save comments',
			'Add/View Note'
		]
	}[tips_language];

	//批注对象显示的文字
	var anno_text = '';
	if (anno_item.my_type == 'highlight' || anno_item.my_type == 'underline') {
		anno_text = anno_item.text;
	} else {
		anno_text = tips[3] + ' : ' + tips[4][anno_item.my_type];
	}

	var storeddata = false;

	for (var i = 0; i < localStorage.length; i++) {
		var key = localStorage.key(i);

		// Check if the key contains the pattern 'bitstreams'
		if (key.includes(anno_item.id)) {
			storeddata = true;
		}
	}
	var dynamicClass = storeddata ? 'page-annotations-container1' : '';
	var dynamicInstruction = storeddata ? '**This annotation has note' : '';
	var this_annotation = document.createElement('div');
	var inner_html = "<div " + hidden_container + " id='page-" + page_number + "-anno-" + anno_item.id +
		"-container' class='page-annotations-container item jtk-endpoint-anchor jtk-connected jtk-draggable " + dynamicClass + "'>" +
		"<i title='" + tips[0] +
		"' style='margin-left: 5px;' onclick='deleteAnnotation(this)' class='fa fa-trash' aria-hidden='true'></i>" +
		"<i title='" + tips[1] +
		"' style='margin-left: 5px;' onclick='copyAnnotation(this)' class='fa fa-clipboard' aria-hidden='true'></i>" +
		"<p title='" + tips[2] + "' onclick='selectAnnotation(this)'>" + anno_text + "</p>" +
		"<p id='page-" + page_number + "-anno-" + anno_item.id + "-comment'" +
		" onfocus='selectAnnotation(this)' title=" + tips[5] + " contenteditable='true' style='padding:3px;background-color: #FFFFFF;margin-top:10px;height:auto;'>" +
		anno_item.comment + "</p>" +
		"<button onclick='saveComment(this)' comment_id='page-" + page_number + "-anno-" + anno_item.id + "-comment'" + "title='" + tips[7] + "' style='margin-top:5px;font-size:15px;'>" + tips[6] + "</button>" +
		"<button onclick='addScatchPadToAnnotation(this)' " + "title='" + tips[7] + "' style='margin-top:5px;margin-left: 9px;font-size:15px;'>" + tips[8] + "</button>" +
		"<p style='margin-top:5px;opacity:0.2;font-weight:600;'><span style='float:left;font-size:3px;'>" +
		anno_item
			.member_id + "</span><span style='float:right;font-size:3px;'>" + this.getDateFromTime(anno_item.id.split(
				'_')[
				0]) +
		"</span></p>" +
		"<p style='margin-top:5px;font-weight:400;font-size:10px'>" + dynamicInstruction + "</p>" +
		"</div>";

	this_annotation.innerHTML = inner_html;

	//保存批注列表的id
	var this_annotation_id = "page-" + page_number + "-anno-" + anno_item.id + "-container";
	this.annotation_list_ids['page-' + page_number].push(this_annotation_id);

	return this_annotation.childNodes[0];
}


//将时间戳格式化为日期
pdfwheel.UI.prototype.getDateFromTime = function (record_time) {
	// 根据毫秒数构建 Date 对象
	Date.prototype.toLocaleString = function () {
		return this.getFullYear() + "-" + (this.getMonth() + 1) + "-" + this.getDate() + '  ' + this
			.getHours() +
			":" + this.getMinutes() + ":" + this.getSeconds();
	};
	// 根据毫秒数构建 Date 对象
	// Date.prototype.toLocaleString = function() {
	// 	return this.getFullYear() + "-" + (this.getMonth() + 1) + "-" + this.getDate();
	// };
	var date = new Date(parseInt(record_time));
	// 按重写的自定义格式，格式化日期
	var dateTime = date.toLocaleString();
	return dateTime;
}



//open highlight and underline annotations list 展开高亮及下划线列表
pdfwheel.UI.prototype.openAnnotations = function (node, open) {
	var parent_node = node.parentNode.parentNode;
	var brother_node = parent_node.parentNode.childNodes;
	for (var i = 0; i < brother_node.length; i++) {
		if (brother_node[i].id && brother_node[i].id != parent_node.id) {
			if (open) {
				document.getElementById(brother_node[i].id).removeAttribute('hidden');
			} else {
				document.getElementById(brother_node[i].id).setAttribute('hidden', true);
			}
		}
	}
}

function addScatchPadToAnnotation(node) {
	var node_id = node.parentNode.getAttribute('id');
	console.log(node_id);
	localStorage.removeItem('addednote');
	localStorage.setItem('addednote', this.PDFViewerApplication.baseUrl.split("?")[0] + '?' + node_id)

}

//copy annotation text 复制批注文本
pdfwheel.UI.prototype.copyAnnotation = function (node) {
	var tips = {
		'zh-cn': [
			'添加批注',
			'添加评论',
		],
		'en': [
			'add comments',
			'comment',
		]
	}[this.tips_language];

	var parent_node = node.parentNode;
	var text = parent_node.innerText;
	if (text.split('\n')[2] == tips[0] || text.split('\n')[2] == tips[1]) {
		text = text.split('\n')[0];
	}

	if (post_to_parent == true) {
		window.parent.postMessage({
			"type": 4,
			"source": "pdfjs",
			"content": text
		}, '*');
	} else {
		this.copyText(text);
	}
}

//copy text 复制文本
pdfwheel.UI.prototype.copyText = function (text) {
	var tips = {
		'zh-cn': [
			'复制成功！',
		],
		'en': [
			'Copied!',
		]
	}[tips_language];

	// number cannot be executed without.length. selectText must be converted to a string
	// 数字没有 .length 不能执行selectText 需要转化成字符串
	const textString = text.toString();
	let input = document.querySelector('#copy-input');
	if (!input) {
		input = document.createElement('input');
		input.id = "copy-input";
		input.readOnly = "readOnly"; // Prevents ios focus from triggering keyboard events 防止ios聚焦触发键盘事件
		input.style.position = "absolute";
		input.style.left = "-2000px";
		input.style.zIndex = "-2000";
		document.body.appendChild(input)
	}

	input.value = textString;
	selectText(input, 0, textString
		.length
	); // ios requires text to be selected first and does not support input.select(); ios必须先选中文字且不支持 input.select();
	if (document.execCommand('copy')) {
		document.execCommand('copy');
		alert(tips[0]);
	}
	input.blur();

	//// input's built-in select() method does not work on the Apple side, so you need to write a similar method to select text. createTextRange(setSelectionRange) is the input method
	// input自带的select()方法在苹果端无法进行选择，所以需要自己去写一个类似的方法选择文本。createTextRange(setSelectionRange)是input方法
	function selectText(textbox, startIndex, stopIndex) {
		if (textbox.createTextRange) { //ie
			const range = textbox.createTextRange();
			range.collapse(true);
			range.moveStart('character', startIndex); //start index 起始光标
			range.moveEnd('character', stopIndex - startIndex); //end index 结束光标
			range.select(); // Not compatible with ios
		} else { //firefox/chrome
			textbox.setSelectionRange(startIndex, stopIndex);
			textbox.focus();
		}
	}
}

// click annotation and navigate to target page 点击批注后跳转到批注所在页面
pdfwheel.UI.prototype.selectAnnotation = function (node) {
	var node_id = node.parentNode.getAttribute('id');
	var id_split = node_id.split('-');
	if (node.textContent.trim() === 'add comments') {
		// Clear the comment content
		node.textContent = "";
	}
	this.goToSelectAnnotation(id_split[1], id_split[3]);
	event.stopPropagation();
}




// click annotation and navigate to target page 点击批注后跳转到批注所在页面
pdfwheel.UI.prototype.goToSelectAnnotation = function (page_number, anno_id) {
	this.PDFViewerApplication.page = parseInt(page_number);
	//不透明度闪烁
	var that = this;
	setTimeout(() => {
		that.shiningAnnotation(['占位', page_number, '占位', anno_id]);
		that.goAnnotationByID(page_number, anno_id);
	}, 1000);
	event.stopPropagation();
}

pdfwheel.UI.prototype.goAnnotationByID = function (page_number, anno_id) {
	var this_anno_id = "page-" + page_number + "-anno-" + anno_id + "-container-link";
	var this_annotation = document.getElementById(this_anno_id);
	// this_span.setAttribute('style', "padding:3px;border:2px solid #ffffff;text-decoration: underline;");

	//视图移动到当前位置
	var viewer_container = document.getElementById('viewerContainer');
	// console.log('viewer_container.scrollLeft',viewer_container.scrollLeft);
	viewer_container.scrollTop = viewer_container.scrollTop + this_annotation.offsetTop - 200;
	viewer_container.scrollLeft = this_annotation.offsetLeft;
}

pdfwheel.UI.prototype.shiningAnnotation = function (id_split) {
	var anno_id = id_split[3];
	var page_number = id_split[1];

	var fabricObj = pdfAnnotation.getFabricObj(page_number);
	// console.log('fabricObj', fabricObj);

	var fabric_canvas = fabricObj.page_canvas.fabric_canvas;
	var anno_objects = fabric_canvas.getObjects();
	anno_objects.forEach(anno_item => {
		if (anno_item.id == anno_id) {
			var old_opacity = anno_item.opacity;
			var max_opacity = 1;
			var min_opacity = 0.1;

			//不透明度闪烁
			setTimeout(() => {
				anno_item.set('opacity', min_opacity);
				fabric_canvas.requestRenderAll();
			}, 300);

			setTimeout(() => {
				anno_item.set('opacity', max_opacity);
				fabric_canvas.requestRenderAll();
			}, 600);

			setTimeout(() => {
				anno_item.set('opacity', min_opacity);
				fabric_canvas.requestRenderAll();
			}, 900);

			setTimeout(() => {
				anno_item.set('opacity', max_opacity);
				fabric_canvas.requestRenderAll();
			}, 1200);

			setTimeout(() => {
				anno_item.set('opacity', min_opacity);
				fabric_canvas.requestRenderAll();
			}, 1500);

			setTimeout(() => {
				anno_item.set('opacity', max_opacity);
				fabric_canvas.requestRenderAll();
			}, 1800);

			setTimeout(() => {
				anno_item.set('opacity', old_opacity);
				fabric_canvas.requestRenderAll();
			}, 2100);
		}
	});
}

//show download dialog  显示下载提示框
pdfwheel.UI.prototype.showDownloadLog = function (log_str) {
	// console.log(log_str);
	let el = document.getElementById("my-download-process-div");
	el.style.top = '150px';
	el.removeAttribute('hidden');

	var log_div = document.getElementById('my-download-process-log');
	log_div.innerText = '';
	log_div.innerText = log_str;
}

//hide download dialog  隐藏下载提示框
pdfwheel.UI.prototype.closeDownloadLog = function () {
	let el = document.getElementById("my-download-process-div");
	el.style.top = '-50px';
	el.setAttribute('hidden', true);
}


// initail fabric draw 初始化 Fabric 画布
pdfwheel.UI.prototype.fabricDraw = function (node) {
	if (pdfAnnotation.free_draw == false) {
		this.setFabricCanvasContainerZIndex(100);
		if (node) {
			node.getElementsByTagName('i')[0].classList.add('button-active');
			node.getElementsByTagName('span')[0].classList.add('button-active');
		}
		pdfAnnotation.free_draw = true;

		//同时隐藏改变画笔的颜色
		var draw_node = document.getElementById('ff-pointer-obj-btn');
		if (draw_node) {
			draw_node.getElementsByTagName('i')[0].classList.remove('button-active');
			draw_node.getElementsByTagName('span')[0].classList.remove('button-active');
		}
	} else {
		this.setFabricCanvasContainerZIndex(10);
		if (node) {
			node.getElementsByTagName('i')[0].classList.remove('button-active');
			node.getElementsByTagName('span')[0].classList.remove('button-active');
		}

		free_draw = false;
	}
	pdfAnnotation.fabric_top = false;

	for (var key in pdfAnnotation.fabric_list) {
		pdfAnnotation.fabric_list[key].page_canvas.fabric_canvas.isDrawingMode = pdfAnnotation.free_draw;
		//确认笔刷样式
		var this_fabric_canvas = pdfAnnotation.fabric_list[key].page_canvas.fabric_canvas;
		var this_brush = null;
		if (pdfAnnotation.eraser_brush == true) {
			this_brush = new fabric.EraserBrush(this_fabric_canvas) // 使用橡皮擦画笔
			this_brush.width = default_eraser_brush_width; // 设置画笔粗细为 10
			// console.log('设置橡皮擦画笔');
		} else {
			this_brush = new fabric.PencilBrush(this_fabric_canvas);
			this_brush.decimate = default_brush_decimate;
			this_brush.width = default_brush_width;
			this_brush.color = default_brush_color;
			this_brush.limitedToCanvasSize = true;
		}
		pdfAnnotation.fabric_list[key].page_canvas.fabric_canvas.freeDrawingBrush = this_brush;
	}
	event.stopPropagation();
}

// initail fabric draw 初始化 Fabric 画布
pdfwheel.UI.prototype.fabricDraw1 = function (node) {
	if (pdfAnnotation.free_draw == false) {
		this.setFabricCanvasContainerZIndex(100);
		if (node) {
			node.getElementsByTagName('i')[0].classList.add('button-active');
			node.getElementsByTagName('span')[0].classList.add('button-active');
		}
		pdfAnnotation.free_draw = true;

		//同时隐藏改变画笔的颜色
		var draw_node = document.getElementById('ff-pointer-obj-btn');
		if (draw_node) {
			draw_node.getElementsByTagName('i')[0].classList.remove('button-active');
			draw_node.getElementsByTagName('span')[0].classList.remove('button-active');
		}
	} else {
		this.setFabricCanvasContainerZIndex(10);
		if (node) {
			node.getElementsByTagName('i')[0].classList.remove('button-active');
			node.getElementsByTagName('span')[0].classList.remove('button-active');
		}

		free_draw = false;
	}
	pdfAnnotation.fabric_top = false;

	for (var key in pdfAnnotation.fabric_list) {
		pdfAnnotation.fabric_list[key].page_canvas.fabric_canvas.isDrawingMode = pdfAnnotation.free_draw;
		//确认笔刷样式
		var this_fabric_canvas = pdfAnnotation.fabric_list[key].page_canvas.fabric_canvas;
		var this_brush = null;
		if (pdfAnnotation.eraser_brush == true) {
			this_brush = new fabric.EraserBrush(this_fabric_canvas) // 使用橡皮擦画笔
			this_brush.width = default_eraser_brush_width; // 设置画笔粗细为 10
			// console.log('设置橡皮擦画笔');
		} else {
			this_brush = new fabric.PencilBrush(this_fabric_canvas);
			this_brush.decimate = default_brush_decimate;
			this_brush.width = default_brush_width1;
			this_brush.color = default_brush_color1;
			this_brush.limitedToCanvasSize = true;
		}
		pdfAnnotation.fabric_list[key].page_canvas.fabric_canvas.freeDrawingBrush = this_brush;
	}
	event.stopPropagation();
}

//修改fabric的绘图模式
pdfwheel.UI.prototype.changeFabricDrawMode = function () {
	for (var key in pdfAnnotation.fabric_list) {
		pdfAnnotation.fabric_list[key].page_canvas.fabric_canvas.isDrawingMode = pdfAnnotation.free_draw;
	}
}

// initail fabric draw 初始化 Fabric 画布
pdfwheel.UI.prototype.fabricDrawNoActive = function (node) {
	if (pdfAnnotation.free_draw == false) {
		this.setFabricCanvasContainerZIndex(100);
		pdfAnnotation.free_draw = true;
	} else {
		this.setFabricCanvasContainerZIndex(10);
		pdfAnnotation.free_draw = false;
		pdfAnnotation.eraser_brush = false;
	}
	pdfAnnotation.fabric_top = false;
	for (var key in pdfAnnotation.fabric_list) {
		pdfAnnotation.fabric_list[key].page_canvas.fabric_canvas.isDrawingMode = pdfAnnotation.free_draw;
	}
}

pdfwheel.UI.prototype.changeMouseText = function () {
	var tips = {
		'zh-cn': [{
			'add_text': '单击插入文字或双击取消',
			'add_arrow': '单击插入箭头或双击取消',
			'add_rect': '拖拽绘制矩形或双击取消',
			'add_screenshot': '拖拽截图或双击取消',
			'add_circle': '拖拽绘制圆或双击取消',
			'add_image': '单击插入图片或双击取消',
			'add_line': '绘制直线或双击取消',
		}],
		'en': [{
			'add_text': 'click insert textbox or doubleclick cancle',
			'add_arrow': 'click insert arrow or doubleclick cancle',
			'add_rect': 'draw rectangle or doubleclick cancle',
			'add_screenshot': 'draw screenshot or doubleclick cancle',
			'add_circle': 'click insert circle or doubleclick cancle',
			'add_image': 'click insert your image or doubleclick cancle',
			'add_line': 'draw straight line or doubleclick cancle',
		}]
	}[this.tips_language];
	this.current_mouse_text = tips[0][pdfAnnotation.current_click_type];
	this.addMouseMoveListen();
	// console.log('当前鼠标的文字', this.current_mouse_text);
}

pdfwheel.UI.prototype.addMouseMoveListen = function () {
	var text = document.getElementById('my_mouse_text');
	text.innerText = this.current_mouse_text;
	pdf_viewer.addEventListener('mousemove', this.moveMouseText);
}

pdfwheel.UI.prototype.moveMouseText = function (e) {
	var text = document.getElementById('my_mouse_text');
	text.style.left = e.pageX + 15 + 'px';
	text.style.top = e.pageY + 15 + 'px';
}

pdfwheel.UI.prototype.removeMouseMoveListen = function () {
	pdf_viewer.removeEventListener('mousemove', this.moveMouseText);

	var text = document.getElementById('my_mouse_text');
	text.innerText = this.current_mouse_text;
	text.style.left = '-500px';
	text.style.top = '-500px';
}

//Keep the gesture zoom force for pdf render pages 保留pdf渲染页面的手势缩放
pdfwheel.UI.prototype.forceZoomIn = function () {
	var DEFAULT_SCALE_DELTA = 1.1;
	var MAX_SCALE = 10;
	let newScale = window.PDFViewerApplication.pdfViewer.currentScale;
	newScale = (newScale * DEFAULT_SCALE_DELTA).toFixed(2);
	newScale = Math.ceil(newScale * 10) / 10;
	newScale = Math.min(MAX_SCALE, newScale);
	window.PDFViewerApplication.pdfViewer.currentScaleValue = newScale;
	//draw annotation 绘制批注
	pdfAnnotation.drawAllPageAnnotations();
}
//Keep the gesture zoom force for pdf render pages 保留pdf渲染页面的手势缩放
pdfwheel.UI.prototype.forceZoomOut = function () {
	var DEFAULT_SCALE_DELTA = 1.1;
	var MIN_SCALE = 0.1;
	let newScale = window.PDFViewerApplication.pdfViewer.currentScale;
	newScale = (newScale / DEFAULT_SCALE_DELTA).toFixed(2);
	newScale = Math.floor(newScale * 10) / 10;
	newScale = Math.max(MIN_SCALE, newScale);
	window.PDFViewerApplication.pdfViewer.currentScaleValue = newScale;
	//draw annotation 绘制批注
	pdfAnnotation.drawAllPageAnnotations();
}

//listn touch event 绑定触屏事件
pdfwheel.UI.prototype.addPinchListener = function () {
	let element = document.getElementById("viewerContainer");
	var that = this;
	element.addEventListener("touchstart", function (e) {
		that.onTouchStart(e);
	});
	element.addEventListener("touchmove", function (e) {
		that.onTouchMove(e);
	});
	element.addEventListener("touchend", function (e) {
		that.onTouchEnd(e);
	});
}

//record touches coordinate for start and end 记录触屏触点坐标 记录起始和结束点
pdfwheel.UI.prototype.onTouchStart = function (evt) {
	this.touchState = {
		//first touch for all touch 多点触屏的第一点
		startX: evt.touches[0].pageX,
		startY: evt.touches[0].pageY,
		endX: evt.touches[0].pageX,
		endY: evt.touches[0].pageY,

		//second touch for all touch 多点触屏的第二点  单点触屏时记录坐标为 -1 
		startX2: evt.touches[1] ? evt.touches[1].pageX : -1,
		startY2: evt.touches[1] ? evt.touches[1].pageY : -1,
		endX2: evt.touches[1] ? evt.touches[1].pageX : -1,
		endY2: evt.touches[1] ? evt.touches[1].pageY : -1
	};
}

//Record the touch screen contact coordinates Update the end point coordinates when the touch screen moves 记录触屏触点坐标 触屏移动时更新结束点坐标
pdfwheel.UI.prototype.onTouchMove = function (evt) {
	if (this.touchState === null) {
		return;
	}
	this.touchState.endX = evt.touches[0].pageX;
	this.touchState.endY = evt.touches[0].pageY;
	this.touchState.endX2 = evt.touches[1] ? evt.touches[1].pageX : -1;
	this.touchState.endY2 = evt.touches[1] ? evt.touches[1].pageY : -1;
}


//Decide whether to zoomIn or zoomUut at the end of the touch screen 触屏结束时 判断是否放大缩小
pdfwheel.UI.prototype.onTouchEnd = function (evt) {
	var touchState = this.touchState;
	if (touchState === null) {
		return evt; //return touch event otherwise through error 返回触屏事件，否则报错[Intervention] Ignored attempt to cancel a touchend event with cancelable=false, for example because scrol
	}

	//弹出选中后操作框
	pdfHighlight.selectionAct();
	//Calculate the distance between two touches points 计算触屏两点间距离
	var getDistance = function (startX, startY, endX, endY) {
		return Math.hypot(endX - startX, endY - startY);
	};

	if (touchState.startX2 != -1 && touchState.endX2 != -1 && touchState.startY2 != -1 && touchState.endY2 != -1) {
		let distanceStart = getDistance(touchState.startX, touchState.startY, touchState.startX2, touchState
			.startY2);
		let distanceEnd = getDistance(touchState.endX, touchState.endY, touchState.endX2, touchState.endY2);
		// Compare the distance between two points at the beginning and two single distances at the end to determine whether it is method or reduction
		//起始时两点距离和结束时两单距离进行比较，判断是方法还是缩小
		if (distanceStart < distanceEnd) {
			this.forceZoomIn();
		} else if (distanceStart > distanceEnd) {
			this.forceZoomOut();
		}
	}
}


// jsPlumb.ready(function() {
// 	var common = {
// 		endpoint: 'Rectangle',
// 		connector: ['Flowchart'],
// 		anchor: ['Left', 'Right']
// 	}

// 	jsPlumb.connect({
// 		source: 'item_left',
// 		target: 'item_right',
// 		endpoint: 'Rectangle'
// 	}, common)

// 	jsPlumb.draggable('item_left')
// 	jsPlumb.draggable('item_right')
// })

pdfwheel.JSplump = function (cfg) {
	cfg = cfg || {};
	this.last_page_number = 0;
	this.draw_connect = false;
	this.last_all_page_list = [];
	this.last_key = '';
};

pdfwheel.JSplump.prototype.clearAllAnnotations = function (node_id) {
	var page_number = node_id.split('-')[1];
	if (page_number == this.last_page_number) {
		this.clearJsPlump(); //如果关闭了最后绘制的连接线，则删除
		this.draw_connect = false;
	} else {
		this.refreshConnections();
	}
}

pdfwheel.JSplump.prototype.refreshConnections = function () {
	//如果不是关闭了当前页面，则重新绘制
	// console.log('重新绘制连线');
	var key = this.last_key;
	var all_page_list = this.last_all_page_list;
	this.connectOnePageAnnotations(key, all_page_list[key]);
}

pdfwheel.JSplump.prototype.connectAllAnnotations = function (node_id) {
	// console.log('pdfAnnotationUI..annotation_list_ids', pdfAnnotationUI.annotation_list_ids);
	// var id_list = ['page-1-anno-1678531092359_2-container', 'page-1-anno-1678531092921_3-container',
	// 	'page-1-anno-1678531093885_4-container', 'page-1-anno-1678531094436_5-container',
	// 	'page-1-anno-1678531096168_6-container', 'page-1-anno-1678531096888_7-container',
	// 	'page-1-anno-1678531098295_8-container'
	// ];
	this.draw_connect = true; //绘制连接线
	// console.log('node_id', node_id);
	var page_number = node_id.split('-')[1];
	var key = 'page-' + page_number;
	var all_page_list = pdfAnnotationUI.annotation_list_ids;

	this.last_page_number = page_number; //当前操作的最后一个页码
	this.last_all_page_list = all_page_list;
	this.last_key = key;


	this.connectOnePageAnnotations(key, all_page_list[key]);
	// 监听批注列表对象滚动
	var annotation_list_container = document.getElementById('annotations_list');
	var that = this;
	if (annotation_list_container) {
		annotation_list_container.addEventListener('scroll', function (e) {
			// console.log('批注列表滚动了,重新绘制');
			that.refreshConnections();
		});
	}

	var viewerContainer = document.getElementById('viewerContainer');
	viewerContainer.addEventListener('scroll', function (e) {
		// console.log('pdf预览页面滚动了');
		that.refreshConnections();
	});

	// for (var key in all_page_list) {
	// 	this.connectOnePageAnnotations(key,all_page_list[key]);
	// }
}

pdfwheel.JSplump.prototype.clearJsPlump = function () {
	// console.log('jsPlumb',jsPlumb);
	if (first_load == false) {
		//清空jsplump画布
		jsPlumb.deleteEveryConnection();
		jsPlumb.deleteEveryEndpoint();
		jsPlumb.reset();
	} else {
		first_load = false;
	}
}

pdfwheel.JSplump.prototype.deleteConnectByID = function (page_number, anno_id) {
	if (this.draw_connect == false) {
		return;
	}
	var this_link_id = "page-" + page_number + "-anno-" + anno_id + "-container-link";
	var connections = jsPlumb.getAllConnections();
	for (var i in connections) {
		// console.log('connections[i]',connections[i]);
		// connections 是线数据数组
		// connections[i].sourceId; // 线的起始html元素的ID
		// connections[i].targetId; // 线的目标html元素的ID
		if (connections[i].sourceId === this_link_id) { // 删除相匹配的线
			jsPlumb.deleteConnection(connections[i]); // deleteConnection(@) 删除链接线  @线对象
			break;
		}
	}

	var that = this;
	setTimeout(function () {
		that.refreshConnections();
	}, 100)
	// this.refreshConnections();
}

pdfwheel.JSplump.prototype.connectOnePageAnnotations = function (key, id_list) {
	if (this.draw_connect == false) {
		return;
	}

	if (id_list == undefined) {
		return;
	}
	this.clearJsPlump();
	var common = {
		// endpoint: 'Dot',
		endpoint: 'Rectangle',
		connector: ['Flowchart'],
		anchor: ['Left', 'Right']
	}

	// var jsplump_container_id = key + '-annotationLayer';
	var jsplump_container_id = 'jsplump-container';
	jsPlumb.setContainer(document.getElementById(jsplump_container_id)); //设置容器id
	// console.log('容器id', jsplump_container_id);
	// var left_id = 'test_jsplump';
	for (var i = 0; i < id_list.length; i++) {
		var right_id = id_list[i];
		var left_id = id_list[i] + '-link';

		var right_e = document.getElementById(right_id);
		var left_e = document.getElementById(left_id);

		if (right_e == null || left_e == null) {
			continue
		}

		//如果对象被隐藏则不绘制连接线
		var hidden_right = right_e.getAttribute('hidden');
		var hidden_left = left_e.getAttribute('hidden');

		if (hidden_right == null && hidden_left == null) {
			var connection = jsPlumb.connect({
				source: left_id,
				target: right_id,
				endpoint: 'Rectangle',
				// endpoint: 'Dot',
				// Endpoints: [
				// 	['Dot', {
				// 		radius: 2
				// 	}],
				// 	['Dot', {
				// 		radius: 2
				// 	}]
				// ],
				paintStyle: {
					strokeWidth: 2, // 设置连接线的粗细
					stroke: "#FFD700", // 连接线的颜色
					dashstyle: "4 2", // 连接线的虚线样式
					shadow: "5px rgba(136, 136, 136, 0.3)", // 阴影
				},
				endpointStyle: {
					fill: 'rgba(136, 136, 136, 0.3)',
					// fill: 'rgba(255, 237, 0,0.60)',
					outlineStroke: 'darkgray',
					// outlineWidth: 2,
					radius: 7,
				},
			}, common);
		}


		// jsPlumb.draggable(left_id);
		// jsPlumb.draggable(right_id);

		// 监听源元素的移动事件
		// jsPlumb.draggable(right_id, {
		// 	stop: function(event) {
		// 		// 源元素移动后，重新计算连接线位置
		// 		connection.repaint();
		// 	}
		// });
	}
}
