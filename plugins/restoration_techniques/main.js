require({
    packages: [
        {
            name: "jquery",
            location: "http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/",
            main: "jquery.min"
        }    
    ]
});
define([
        "dojo/_base/declare", "framework/PluginBase", 'plugins/restoration_techniques/ConstrainedMoveable', 'plugins/restoration_techniques/jquery-ui-1.11.0/jquery-ui',
		
		"esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/FeatureLayer", "esri/tasks/QueryTask", "esri/tasks/query", "esri/graphicsUtils",
		
		"esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleMarkerSymbol", "esri/graphic", "esri/symbols/Font", 
		"esri/symbols/TextSymbol", "esri/symbols/PictureMarkerSymbol", "dojo/_base/Color", "esri/renderers/SimpleRenderer",		
		
		"dijit/registry", "dijit/form/Button", "dijit/form/DropDownButton", "dijit/DropDownMenu", "dijit/MenuItem", "dijit/layout/ContentPane",
		"dijit/form/HorizontalSlider", "dijit/form/CheckBox", "dijit/form/RadioButton", 
		
		"dojo/dom", "dojo/dom-class", "dojo/dom-style", "dojo/_base/window", "dojo/dom-construct", "dojo/dom-attr", "dijit/Dialog", "dojo/dom-geometry",
		"dojo/_base/array", "dojo/_base/lang", "dojo/on", "dojo/parser", "dojo/query", "dojo/NodeList-traverse", "dojo/dnd/Moveable", "dojo/dnd/move",
		
		"dojo/text!./layerviz.json", "jquery"
       ],
       function ( declare, PluginBase, ConstrainedMoveable, ui, 
					ArcGISDynamicMapServiceLayer, FeatureLayer, QueryTask, esriQuery, graphicsUtils,
					SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, Graphic, Font, TextSymbol, PictureMarkerSymbol, Color, SimpleRenderer,
					registry, Button, DropDownButton, DropDownMenu, MenuItem, ContentPane, HorizontalSlider, CheckBox, RadioButton,
					dom, domClass, domStyle, win, domConstruct, domAttr, Dialog, domGeom, array, lang, on, parser, dojoquery, NodeListtraverse, Moveable, move,
					layerViz, $ ) {
					
			return declare(PluginBase, {
				toolbarName: "Restoration Explorer",
				toolbarType: "sidebar",
				showServiceLayersInLegend: true,
				allowIdentifyWhenActive: false,
				rendered: false,
				
			   
				activate: function () {
					if (this.rendered == false) {
						this.rendered = true;
						this.render();
						this.currentLayer.setVisibility(true);
					} else {
						if (this.currentLayer != undefined)  {
							this.currentLayer.setVisibility(true);	
						}
					}
			    },
				
				deactivate: function () {
					
				},
				hibernate: function () { 
					if (this.infoarea.domNode != undefined){
						domStyle.set(this.infoarea.domNode, 'display', 'none');
					}
					if (this.currentLayer != undefined)  {
						this.currentLayer.setVisibility(false);
						this.map.graphics.clear();
					}
					$('#' + this.b).hide();
				},
			   
			   	initialize: function (frameworkParameters) {		
					declare.safeMixin(this, frameworkParameters);
					domClass.add(this.container, "claro");
					con = dom.byId('plugins/restoration_techniques-0');
						domStyle.set(con, "width", "245px");
						domStyle.set(con, "height", "580px");
					con1 = dom.byId('plugins/restoration_techniques-1');
					if (con1 != undefined){
						domStyle.set(con1, "width", "245px");
						domStyle.set(con1, "height", "580px");
					}
					this.layerVizObject = dojo.eval("[" + layerViz + "]")[0];
					this.controls = this.layerVizObject.controls;
				},
				
				resize: function(w, h) {
					cdg = domGeom.position(this.container);
					if (cdg.h == 0) {
						this.sph = this.height - 120 	
					} else {
						this.sph = cdg.h-82;
					}
					domStyle.set(this.sliderpane.domNode, "height", this.sph + "px"); 
					
				 },
				
				zoomToActive: function() {
					this.map.setExtent(this.currentLayer.fullExtent, true);				
				},
				
				changeOpacity: function(e) {
					this.currentLayer.setOpacity(1 - e)
				},
				
				render: function() {
					this.map.on("load", function(){
						this.map.graphics.enableMouseEvents();
					});	
					this.pntSym = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SQUARE, 8,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([0,255,0]), 1.5),
						new Color([255,255,0,0.1]));
					this.highlightSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SQUARE, 8,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([0,0,255]), 1.5),
						new Color([255,255,0,0.3]));
					this.sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([161,70,18]), 2),new Color([255,255,0,0])
					  );			
					this.slayers = [];
					this.tier1Layers = this.layerVizObject.tier1Layers
					mymap = dom.byId(this.map.id);
					a = dojoquery(mymap).parent();
					this.infoarea = new ContentPane({
						style:"z-index:10000; !important;position:absolute !important;left:320px !important; top:65px !important;background-color:#FFF !important;padding:10px !important;border-style:solid;border-width:4px;border-color:#444;border-radius:5px;display: none",
						innerHTML: "<div class='infoareacloser' style='float:right !important'><a href='#'>✖</a></div><div class='infoareacontent' style='padding-top:0px'>no content yet</div>"
					});
					dom.byId(a[0]).appendChild(this.infoarea.domNode)
					ina = dojoquery(this.infoarea.domNode).children(".infoareacloser");
					this.infoAreaCloser = ina[0];
					inac = dojoquery(this.infoarea.domNode).children(".infoareacontent");
					this.infoareacontent = inac[0];
					on(this.infoAreaCloser, "click", lang.hitch(this,function(e){
						domStyle.set(this.infoarea.domNode, 'display', 'none');
					}));
					this.sliderpane = new ContentPane({
					  //style:"height:" + this.sph + "px !important"
					});
					parser.parse();
					dom.byId(this.container).appendChild(this.sliderpane.domNode);
					
					
					//tab container
					mymap = dom.byId(this.map.id);
					a = dojoquery(mymap).parent();
					this.b = makeid();
					//console.log(this.b)	
					
					this.tabarea = new ContentPane({
					  id: this.b,
					  style:"display:none; z-index:8; position:absolute; right:105px; width:260px; top:60px; background-color:#FFF; border-style:solid; border-width:4px; border-color:#444; border-radius:5px;",
					  innerHTML: "<div class='tabareacloser' style='float:right !important;'><a href='#' style='color:#cecfce'>✖</a></div><div id='" + this.sliderpane.id + "tabHeader' style='background-color:#424542; color:#fff; height:28px; font-size:1em; font-weight:bold; padding:8px 0px 0px 10px; cursor:move;'>Identify Restoration Technique Cells</div>" +	
						"<div id='" + this.sliderpane.id + "idContent' class='idDiv'>" +
						  "<p id='" + this.sliderpane.id + "idIntro'></p>" +
						  "<div id='" + this.sliderpane.id + "idResults' style='display:none; class='idResults'>" +
							"<b>Environmental Parameter Thresholds Met:</b><br>" +
							"<p id='" + this.sliderpane.id + "erosion' style='display:none; margin-bottom:0px;'></p>" +
							"<p id='" + this.sliderpane.id + "tidal' style='display:none; margin-bottom:0px;'></p>" +
							"<p id='" + this.sliderpane.id + "wave' style='display:none; margin-bottom:0px;'></p>" +							
							"<p id='" + this.sliderpane.id + "ice' style='display:none; margin-bottom:0px;'></p>" +
							"<p id='" + this.sliderpane.id + "shoreline' style='display:none; margin-bottom:0px;'></p>" +							
							"<p id='" + this.sliderpane.id + "nearshore' style='display:none; margin-bottom:0px;'></p>" +
							"<p id='" + this.sliderpane.id + "totalc' style='display:none; margin-bottom:0px;'></p>" +
						  "</div>" +
						"</div>" 		
					});
							
					dom.byId(a[0]).appendChild(this.tabarea.domNode)
					
					ta = dojoquery(this.tabarea.domNode).children(".tabareacloser");
						this.tabareacloser = ta[0];
					/*
					tac = dojoquery(this.tabarea.domNode).children(".tabareacontent");
					this.tabareacontent = tac[0];
					*/				
					on(this.tabareacloser, "click", lang.hitch(this,function(e){
						domStyle.set(this.tabarea.domNode, 'display', 'none');
						this.map.graphics.clear();
						$('#' + this.sliderpane.id + 'idIntro').show();
						$('#' + this.sliderpane.id + 'idResults').hide();
					}));
					
					var p = new ConstrainedMoveable(
						dom.byId(this.tabarea.id), {
						handle: dom.byId(this.sliderpane.id + "tabHeader"),	
						within: true
					});
					this.map.on ("extent-change", lang.hitch(this,function(e,p,b,l){	 
						this.l = e.lod.level
						//console.log(e.lod);	
						if (this.l < 18){
							this.pntSym.size = 10;
							this.highlightSymbol.size = 10;
							$('#' + this.sliderpane.id + 'idIntro').text("Zoom in to initialize the identify feature for this technique");
						}
						if (this.l == 18){
							this.pntSym.size = 17;
							this.highlightSymbol.size = 17;
						}
						if (this.l == 19){
							this.pntSym.size = 32;
							this.highlightSymbol.size = 32;
						}	
						if (this.l > 16){
							$('#' + this.sliderpane.id + 'idIntro').text("Click on the selected technique to learn more about each grid");
						}						
					}));				
					
					this.buttonpane = new ContentPane({
					  style:"border-top-style:groove !important; height:80px;overflow: hidden !important;background-color:#F3F3F3 !important;padding:10px !important;"
					});
					dom.byId(this.container).appendChild(this.buttonpane.domNode);	
					if (this.layerVizObject.methods != undefined) {
						methodsButton = new Button({
							label: "Methods",
							style:  "float:right !important; margin-right:-7px !important; margin-top:-7px !important;",
							onClick: lang.hitch(this,function(){window.open(this.layerVizObject.methods)})  //function(){window.open(this.layerVizObject.methods)}
							});	
						this.buttonpane.domNode.appendChild(methodsButton.domNode);
					}					
					nslidernodetitle = domConstruct.create("span", {innerHTML: " Layer Properties: "});
					this.buttonpane.domNode.appendChild(nslidernodetitle);
					nslidernode = domConstruct.create("div");
					this.buttonpane.domNode.appendChild(nslidernode); 
					labelsnode = domConstruct.create("ol", {"data-dojo-type":"dijit/form/HorizontalRuleLabels", container:"bottomDecoration", style:"height:0.25em;padding-top: 10px !important;color:black !important", innerHTML: "<li>Opaque</li><li>Transparent</li>"})
					nslidernode.appendChild(labelsnode);
					slider = new HorizontalSlider({
						value: 0,
						minimum: 0,
						maximum: 1,
						showButtons:false,
						title: "Change the layer transparency",
						//intermediateChanges: true,
						//discreteValues: entry.options.length,
						onChange: lang.hitch(this,this.changeOpacity),
						style: "width:150px;margin-top:10px;margin-bottom:20px;margin-left:20px; background-color:#F3F3F3 !important"
					}, nslidernode);
					parser.parse()
					
					array.forEach(this.controls, lang.hitch(this,function(entry, groupid){
						if (entry.type == "group") {		
							if ( entry.control == "dropdown" ) {
								ddHolder = domConstruct.create("div",{
									id: this.sliderpane.id + "buttonDiv"
								});
								this.sliderpane.domNode.appendChild(ddHolder);
								dd1Holder = domConstruct.create("div",{
									id: this.sliderpane.id + "button1Div",
									style: "display: none;"
								});
								this.sliderpane.domNode.appendChild(dd1Holder);
								this.field = entry.field;
								this.field1 = entry.field1;
								this.ln = entry.layerNumber;
								this.countyFL = new FeatureLayer(this.layerVizObject.url + "/" + this.ln, { mode: esri.layers.FeatureLayer.MODE_SELECTION, outFields: "*"});
								dojo.connect(this.countyFL, "onSelectionComplete", lang.hitch(this,function(features){
									this.addFirstDropdown(features);
								}));
								var selectCounties = new esriQuery();
								selectCounties.where = this.field + " Like '%'";
								this.countyFL.selectFeatures(selectCounties, FeatureLayer.SELECTION_NEW); 
								this.munFL = new FeatureLayer(this.layerVizObject.url + "/" + this.ln, { mode: esri.layers.FeatureLayer.MODE_SELECTION, outFields: "*"});
								dojo.connect(this.munFL, "onSelectionComplete", lang.hitch(this,function(f){
									this.zoomToSel(f);
								}));
								this.munFL.setSelectionSymbol(this.sfs);
								this.map.addLayer(this.munFL);
							}
							if (entry.header != undefined){
								// Add header text and info icon
								if (entry.header[0].headerLevel == "main"){
									hhtml = "<b>" + entry.header[0].text + ": </b>"
									mar = "margin-left:0px;"
									mar1 = "margin-left:10px;"
								}
								if (entry.header[0].headerLevel == "sub"){
									hhtml = "<hr style='background-color: #4a96de; height:1px; border:0; margin-top:-7px; margin-bottom:7px;" + 
									"background-image: -webkit-linear-gradient(left, #ccc, #4a96de, #ccc);background-image: -moz-linear-gradient(left, #ccc, #4a96de, #ccc);" + 
									"background-image: -ms-linear-gradient(left, #ccc, #4a96de, #ccc); background-image: -o-linear-gradient(left, #ccc, #4a96de, #ccc);'>" + entry.header[0].text + ": "
									mar = "margin-left:10px;"
									mar1 = "margin-left:0px;"
								}
								nslidernodeheader = domConstruct.create("div", {
									id: this.sliderpane.id + "_" + groupid, 
									style:"display:" + entry.display + ';' + mar, 
									innerHTML: hhtml
								});
								this.sliderpane.domNode.appendChild(nslidernodeheader);	
								infoPic = domConstruct.create("a", {
									style: "color:black;",
									href: "#",
									title: "Click for more information",
									innerHTML: "<img src='data:image/png;base64,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'>"
								})
								if (entry.header[0].helpTitle != ""){
									nslidernodeheader.appendChild(infoPic);
								}
								on(infoPic, "click", lang.hitch(this,function(e){
									domStyle.set(this.infoarea.domNode, 'display', '');
									this.infoareacontent.innerHTML = "<b>" + entry.header[0].helpTitle + "</b><div style='height:8px'></div><div style='max-width:300px; max-height:530px;'>" + entry.header[0].helpText + "</div>";
								}));
							}
			
							if ( entry.control == "radio" ) {
								ncontrolsnode = domConstruct.create("div", {
									id: this.sliderpane.id + entry.header[0].name + "_" + groupid,
									style: "margin-top:5px;margin-left:10px;"
								});
								nslidernodeheader.appendChild(ncontrolsnode);
								rlen = entry.options.length - 1;
								array.forEach(entry.options, lang.hitch(this,function(option, i){
									rorc = RadioButton;
									ncontrolnode = domConstruct.create("div");
									ncontrolsnode.appendChild(ncontrolnode); 
									parser.parse();
									ncontrol = new rorc({
										name: this.map.id + groupid,
										id: this.sliderpane.id + "_radio_" + groupid + "_" + i,
										value: option.value,
										index: this.map.id + groupid,
										title: option.text,
										checked: option.selected,
										onClick: lang.hitch(this,function(e) { 
											if(e) {
												this.radioClick(i, groupid);
											}
										})
									}, ncontrolnode);
									if (rlen == i){
										inhtml = "<span style='color:#000;' id='" + this.sliderpane.id + "_lvoption_" + groupid + "_" + i + "'> " + option.text + "</span><br><br>"
									}else{
										inhtml = "<span style='color:#000;' id='" + this.sliderpane.id + "_lvoption_" + groupid + "_" + i + "'> " + option.text + "</span><br>"
									}
									nslidernodeheader = domConstruct.create("div", {
										style:"display:inline;", 
										innerHTML: inhtml
									});									
									ncontrolsnode.appendChild(nslidernodeheader);
																		
									parser.parse()	
								})); 
							}
							
							if ( entry.control == "checkbox" ) {
								ncontrolsnode = domConstruct.create("div", {
									id: this.sliderpane.id + entry.header[0].name + "_" + groupid,
									style: "margin-top:5px;" + mar1
								});
								nslidernodeheader.appendChild(ncontrolsnode);
								rlen = entry.options.length - 1;
								array.forEach(entry.options, lang.hitch(this,function(option, i){
									ncontrolnode = domConstruct.create("div");
									ncontrolsnode.appendChild(ncontrolnode); 
									parser.parse();
									ncontrol = new CheckBox({
										name: this.map.id + groupid,
										id: this.sliderpane.id + "_radio_" + groupid + "_" + i,
										value: option.value,
										title: option.text,
										checked: option.selected,
										onClick: lang.hitch(this,function(e) { 
											this.cbClick(option.layerNumber, e, i, groupid);
										})
									}, ncontrolnode);
									
									if (i == 0){
										ihtml = "<span id='" + this.sliderpane.id + "_lvoption_" + groupid + "_" + i + "'>" + option.text + "</span><br>"
									}else{
										if (rlen == i){
											ihtml = "<span id='" + this.sliderpane.id + "_lvoption_" + groupid + "_" + i + "'><a class='epa'>" + option.text + "</a></span><br><br>"
										}else{
											ihtml = "<span id='" + this.sliderpane.id + "_lvoption_" + groupid + "_" + i + "'><a class='epa'>" + option.text + "</a></span><br>"
										}
									}
									nslidernodeheader = domConstruct.create("div", {
										style:"display:inline;", 
										innerHTML: ihtml
									});									
									ncontrolsnode.appendChild(nslidernodeheader); 
									
									on(nslidernodeheader, "click", lang.hitch(this,function(e){
										if (option.helpTable != undefined){
//											domStyle.set(this.infoarea.domNode, 'style', '');
											domStyle.set(this.infoarea.domNode, 'display', '');
											this.infoareacontent.innerHTML = "<p style='font-weight:bold;margin-top:10px;margin-left:0px;margin-bottom:0px;text-align:center;'>Environmental Parameter Criteria Thresholds: " + option.text + "</p><table id='" + this.sliderpane.id + "_infoTable' class='tbl'><thead><tr></tr></thead><tbody class='tbodyc'></tbody></table>"
											var tblid = this.sliderpane.id + '_infoTable'
											$.each(this.layerVizObject[option.helpTable], function(i, v){
												$.each(v, function(key, valArray){
													if (key == "header"){
														$.each(valArray, function(i2, hval){
															$('#' + tblid + ' thead tr').append("<th class='tbl thc'>" + hval + "</th>")
														});			
													}
													else{
														var tbl = "";
														$.each(valArray, function(i3, rval){
															var sty = "black; font-weight:bold; text-align:left;"
															if (rval == "Yes"){
																sty = "green;"
															}
															if (rval == "No"){
																sty = "red;"
															}
															if (rval == "NA"){
																sty = "black;"
															}
															tbl = tbl + "<td class='tbl tdc' style='color:" + sty + "'>" + rval + "</td>"
														})
														$('#' + tblid + ' tbody').append("<tr>" + tbl + "</tr>")
													}
												});
											});
										}	
									}));
									parser.parse()	
								})); 
							}
							
							nslidernodeheader = domConstruct.create("div");
							this.sliderpane.domNode.appendChild(nslidernodeheader);
						}						
						ncontrolsnode = domConstruct.create("div");
						this.sliderpane.domNode.appendChild(ncontrolsnode);
					}));
					this.currentLayer = new ArcGISDynamicMapServiceLayer(this.layerVizObject.url);
					this.map.addLayer(this.currentLayer);
					dojo.connect(this.currentLayer, "onLoad", lang.hitch(this,function(e){
						this.map.setExtent(this.currentLayer.fullExtent, true);
					}));
					this.resize();
				},
				
				addFirstDropdown: function(c){
					var f = this.field;
					var f1 = this.field1;
		
					var c1 = c;
					var county = [];
					for(var i = 0; i < c.length; i++) {
						county.push(c[i].attributes[this.field]);
					}
					var countyDD = unique(county).sort();
					
					menu = new DropDownMenu({ 
						style: "display: none;",
						maxHeight: "150"
					});
					domClass.add(menu.domNode, "claro");
					var cl = countyDD.length - 1;
					array.forEach(countyDD, lang.hitch(this,function(v, j){
						if (j == cl){
							var sty = "border: 1px solid #d2e6f7; box-shadow: 1px 1px 1px #d2e6f7 !important;";
						}else{
							var sty = "border: 1px solid #d2e6f7; box-shadow: 1px 0px 1px #d2e6f7 !important;";
						}
						menuItem = new MenuItem({
							style: sty,
							label: v,
							onClick: lang.hitch(this,function(e) { 
								var mun = [];
								for(var i = 0; i < c1.length; i++) {
									if (v == c1[i].attributes[f]){
										mun.push(c1[i].attributes[f1])
									}
								}
								dojo.byId(this.button).set("label", v + " County")
								this.updateDD(mun, v);	
							})												
						});
						menu.addChild(menuItem);
					}));
					this.button = new DropDownButton({
						label: "Choose a County",
						style: "margin-bottom:6px !important;",
						maxHeight: "150",
						dropDown: menu
					});
					
					dojo.byId(this.sliderpane.id + "buttonDiv").appendChild(this.button.domNode);
					
					this.menu1 = new DropDownMenu({ 
						style: "display: none;",
						maxHeight: "150"							
					});
					domClass.add(this.menu1.domNode, "claro");
					
					this.button1 = new DropDownButton({
						label: "Choose a Municipality",
						style: "margin-bottom:12px !important;",
						maxHeight: "150",
						dropDown: this.menu1
					});
					
					dojo.byId(this.sliderpane.id + "button1Div").appendChild(this.button1.domNode);
					
				},
				
				updateDD: function(mun, v){
					$('#' + this.sliderpane.id + 'button1Div').show();
					dojo.byId(this.button1).set("label", "Choose a Municipality")
					this.menu1.destroyDescendants();
					mun.sort()
					array.forEach(mun, lang.hitch(this,function(m){
						menuItem1 = new MenuItem({
							style: "border: 1px solid #d2e6f7;",
							label: m,
							onClick: lang.hitch(this,function(){
								var selectMun = new esriQuery();
								selectMun.where = this.field  + " = '" + v + "' AND " + this.field1 + " = '" + m + "'";
								this.munFL.selectFeatures(selectMun, FeatureLayer.SELECTION_NEW); 
								dojo.byId(this.button1).set("label", m)
							})
						});
						this.menu1.addChild(menuItem1);
					}));
				},
				
				zoomToSel: function(f) {
					var munExtent = f[0].geometry.getExtent();   
					this.map.setExtent(munExtent, true); 
					$('#' + this.sliderpane.id + '_1').show();
				},
				
				radioClick: function(val,group) {
					console.log(val + " " + group)
					if (this.featureLayer != undefined){
						this.map.removeLayer(this.featureLayer);
					}
					//set all radio buttons in group to false
					array.forEach(this.controls[group].options, lang.hitch(this,function(option, i){
						option.selected = false;
					}));
					//set selected radio to true	
					this.controls[group].options[val].selected = true;
					//check if show data level
					if (this.controls[group].options[val].showData == "no"){
						this.slayers = [];	
						this.currentLayer.setVisibleLayers(this.slayers);
						$('#' + this.b).hide();
						this.map.graphics.clear();
						if (this.featureLayerOD != undefined){
							this.map.removeLayer(this.featureLayerOD);			
						}
					}
					if (this.controls[group].options[val].showData == "yes"){
						var selectedLayer = this.controls[group].options[val].layerNumber

						// add newly selected layer to visible layer array
						this.slayers = [];	
						this.slayers.push(selectedLayer);
						this.currentLayer.setVisibleLayers(this.slayers);
						
						// set up identify functionality
						this.identifyFeatures(val, group);
					}
					if (this.controls[group].options[val].groupsBelow == "yes"){
						//get value and current level
						this.value = this.controls[group].options[val].value;
						this.level = this.controls[group].level;
						this.childlevel = 99;
						// use parentValue to find child level - clear selections on level greater than clicked level
						array.forEach(this.controls, lang.hitch(this,function(entry, groupid){
							if (entry.parentValue == this.value){
								this.childlevel = entry.level;
							}
							if (entry.level > this.level){
								array.forEach(entry.options, lang.hitch(this,function(option, i){
									if (option.leaveOn === undefined){
										option.selected = false;
										dijit.byId(this.sliderpane.id + "_radio_" + groupid + "_" + i).set('checked', false);
									}
								}));
							}
						}));
						// show groups where value and level match. hide groups that match levels but not parent
						array.forEach(this.controls, lang.hitch(this,function(entry, groupid){
							if (entry.level == this.childlevel && entry.parentValue != this.value){
								$('#' + this.sliderpane.id + "_" + groupid).hide();
							}
							if (entry.level > this.childlevel){
								$('#' + this.sliderpane.id + "_" + groupid).hide();
							}
						}));
						array.forEach(this.controls, lang.hitch(this,function(entry, groupid){
							if (entry.level == this.childlevel && entry.parentValue == this.value){
								$('#' + this.sliderpane.id + "_" + groupid).show('slow');
							}
							if (entry.level == this.childlevel && entry.parentValue == "all"){
								$('#' + this.sliderpane.id + "_" + groupid).show('slow');
							}
						}));						
					}
				},
				
				cbClick: function(lyrnum, e, val, group) {
					if (e.target.checked === true){
						this.slayers.push(lyrnum);
						this.identifyFeatures(val, group);
					}else{
						var index = this.slayers.indexOf(lyrnum)
						this.slayers.splice(index, 1);
					}
					this.currentLayer.setVisibleLayers(this.slayers);
					
				},
				
				identifyFeatures: function(val, group){
					if (this.controls[group].options[val].identifyNumber != ""){
						if (this.featureLayerOD != undefined){
							this.map.removeLayer(this.featureLayerOD);			
						}
						$('#' + this.b).show();
						idLyrNum = "/" + this.controls[group].options[val].identifyNumber;	
						this.featureLayerOD = new FeatureLayer(this.layerVizObject.url + idLyrNum, {
							mode: esri.layers.FeatureLayer.ONDEMAND,
							opacity: "0",
							outFields: "*"
						});
						this.featureLayerOD.setRenderer(new SimpleRenderer(this.pntSym));
	
						// call function to capture and display selected feature layer attributes
						
						this.featureLayerOD.on("mouse-over", lang.hitch(this,function(evt){
							this.map.setMapCursor("pointer");
						//	this.highlightGraphic = new Graphic(evt.graphic.geometry,this.highlightSymbol);
						//	this.map.graphics.add(this.highlightGraphic);
						}));
						this.featureLayerOD.on("mouse-out", lang.hitch(this,function(evt){
							this.map.setMapCursor("default");
						//	this.map.graphics.remove(this.highlightGraphic);
						}));
						this.featureLayerOD.on("mouse-down", lang.hitch(this,function(evt){
							atts = evt.graphic.attributes;
							this.showAttributes(atts);
							this.map.graphics.clear();
							this.selectedGraphic = new Graphic(evt.graphic.geometry,this.pntSym);
							this.map.graphics.add(this.selectedGraphic);
							//this.map.graphics.remove(this.highlightGraphic);
						}));
						this.map.addLayer(this.featureLayerOD);
					}else{
						$('#' + this.b).hide();
						this.map.graphics.clear();
						if (this.featureLayerOD != undefined){
							this.map.removeLayer(this.featureLayerOD);			
						}
					}
				},
				
				showAttributes: function(atts) {
					//console.log(atts);
					$('#' + this.b).show();
					$('#' + this.sliderpane.id + 'idIntro').hide();
					$('#' + this.sliderpane.id + 'idResults').show();
					if (atts.ErosionCriteriaThreshold == 0){
						$('#' + this.sliderpane.id + 'erosion').hide();
					}
					if (atts.ErosionCriteriaThreshold == 1){
						$('#' + this.sliderpane.id + 'erosion').html('Erosion Shoreline Change: <b>No</b>').show();
					}
					if (atts.ErosionCriteriaThreshold == 2){
						$('#' + this.sliderpane.id + 'erosion').html('Erosion Shoreline Change: <b>Yes</b>').show();
					}
					if (atts.TidalRangeCriteriaThreshold == 0){
						$('#' + this.sliderpane.id + 'tidal').hide();
					}
					if (atts.TidalRangeCriteriaThreshold == 1){
						$('#' + this.sliderpane.id + 'tidal').html('Tidal Range: <b>No</b>').show();
					}
					if (atts.TidalRangeCriteriaThreshold == 2){
						$('#' + this.sliderpane.id + 'tidal').html('Tidal Range: <b>Yes</b>').show();
					}
					if (atts.WaveHtMaxCriteriaThreshold == 0){
						$('#' + this.sliderpane.id + 'wave').hide();
					}
					if (atts.WaveHtMaxCriteriaThreshold == 1){
						$('#' + this.sliderpane.id + 'wave').html('Wave Height: <b>No</b>').show();
					}
					if (atts.WaveHtMaxCriteriaThreshold == 2){
						$('#' + this.sliderpane.id + 'wave').html('Wave Height: <b>Yes</b>').show();
					}
					if (atts.IceCoverCriteriaThreshold == 0){
						$('#' + this.sliderpane.id + 'ice').hide();
					}
					if (atts.IceCoverCriteriaThreshold == 1){
						$('#' + this.sliderpane.id + 'ice').html('Ice Cover: <b>No</b>').show();
					}
					if (atts.IceCoverCriteriaThreshold == 2){
						$('#' + this.sliderpane.id + 'ice').html('Ice Cover: <b>Yes</b>').show();
					}
					if (atts.ShorelineSlopeCriteriaThreshold == 0){
						$('#' + this.sliderpane.id + 'shoreline').hide();
					}
					if (atts.ShorelineSlopeCriteriaThreshold == 1){
						$('#' + this.sliderpane.id + 'shoreline').html('Shoreline Slope: <b>No</b>').show();
					}
					if (atts.ShorelineSlopeCriteriaThreshold == 2){
						$('#' + this.sliderpane.id + 'shoreline').html('Shoreline Slope: <b>Yes</b>').show();
					}
					if (atts.NearshoreSlopeCriteriaThreshold == 0){
						$('#' + this.sliderpane.id + 'nearshore').hide();
					}
					if (atts.NearshoreSlopeCriteriaThreshold == 1){
						$('#' + this.sliderpane.id + 'nearshore').html('Nearshore Slope: <b>No</b>').show();
					}
					if (atts.NearshoreSlopeCriteriaThreshold == 2){
						$('#' + this.sliderpane.id + 'nearshore').html('Nearshore Slope: <b>Yes</b>').show();
					}
					$('#' + this.sliderpane.id + 'totalc').html('Total Criteria Satisfied: <b>' + atts.TotalCriteriaSatisfied + '</b>').show();
				},
				
				getState: function () { 
			   		state = this.controls;
					return state;
				},
				
				setState: function (state) { 
					this.controls = state;
					this.render();		
				}
           });
       });	   
function makeid(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
function unique(list) {
  var result = [];
  $.each(list, function(i, e) {
    if ($.inArray(e, result) == -1) result.push(e);
  });
  return result;
}