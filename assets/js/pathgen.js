var canvas;
var context;

var canvasWidth = 0;
var canvasHeight = 0;

var imageWidth = 0;
var imageHeight = 0;    

var startCoords = new Array();
var endCoords = new Array();    

var imageObj;
var imageUpdater;

//

$(document).ready(function() {

	canvas = document.getElementById('imageCanvas');
	context = canvas.getContext('2d');

	canvasWidth = canvas.width;
	canvasHeight = canvas.height;

	imageObj = new Image();
	imageObj.src = './assets/images/pigtails-girl.png'; 	
	
	imageObj.onload = function() {
		traceImage(this);
	};
	
	imageUpdater = document.getElementById('imageFile');
	imageUpdater.addEventListener('change', updateImage, false);
	
	//
	
	$("input[name='radOutputFormats']").on("change", function(e) {

		updateOutput();

	});

	$("#btnRecalculate").on("click", function(e) {

		var noRaycasters = parseInt($("#txtNoRaycasters").val());
		if(noRaycasters < 16) {
			alert("Please enter a minimum raycasters value of 16!");
			return;
		}
	
		if(noRaycasters > 360) {
			alert("Please enter a maximum raycasters value of 360!");
			return;
		}
	
		var tolerance = parseFloat($("#txtTolerance").val());
		if(tolerance <= 0) {
			alert("Please enter a tolerance value greater than 0!");
			return;
		}

		traceImage(imageObj);

	});	

});

//

function updateImage(e) {

	var reader = new FileReader();
	reader.onload = function (event) {

		imageObj.src = event.target.result; 
	}
	reader.readAsDataURL(e.target.files[0]);
	
} 



function traceImage(imageObj) {

	imageWidth = imageObj.width;
	imageHeight = imageObj.height;

	var imageX = (canvasWidth - imageWidth) / 2;
	var imageY = (canvasHeight - imageHeight) / 2 ;

	context.clearRect(0, 0, canvasWidth, canvasHeight);

	$("#txtOutput").html("");

	context.drawImage(imageObj, imageX, imageY);

	//context.fillStyle = '#00FF00';
	//context.fillRect(50, 50, 50, 50);

	var pixels = context.getImageData(0, 0, canvasWidth, canvasHeight);
	var pixelData = pixels.data;

	var colour = '#0000FF';
	var x = 0; y = 0;

	startCoords = new Array();

	for(var theta = 360; theta > 0; theta -= (360 / parseInt($("#txtNoRaycasters").val()))) {

		x = Math.round((((canvasWidth / 2) - 1) * Math.cos(degreesToRadians(theta)))) + (canvasWidth / 2);
		y = Math.round((((canvasHeight / 2) - 1) * Math.sin(degreesToRadians(theta)))) + (canvasHeight / 2);

		//drawPixel(x, y, '#00FF00');

		startCoords.push({ "x":x, "y":y });

	}

	// draw lines from start points to centre of canvas

	endCoords = new Array();

	var endCoord = { "x":0, "y":0 };

	for (var coordIndex = 0; coordIndex < startCoords.length; coordIndex++) {

		endCoord = getEndCoordFromRaycaster(pixelData, startCoords[coordIndex].x, startCoords[coordIndex].y, canvasWidth / 2, canvasHeight / 2, colour);
		endCoords.push(endCoord);

	}
	endCoords = simplify(endCoords, parseFloat($("#txtTolerance").val()), ($("#chkHighQuality").prop("checked") == true ? true : false));

	// convert to convex hull
	
	if($("#chkForceConvex").prop("checked") == true) {
		
		//Create a new instance.
		var convexHull = new ConvexHullGrahamScan();

		//add points (needs to be done for each point, a foreach loop on the input array can be used.)
		for(var i = 0; i < endCoords.length; i++) {
			convexHull.addPoint(endCoords[i].x, endCoords[i].y);
		}	

		//getHull() returns the array of points that make up the convex hull.
		var hullPoints = convexHull.getHull();
	
		endCoords = hullPoints;
		
	}
	
	//

	$("#spnTotalPoints").html(endCoords.length);

	if(endCoords.length > 0) {

		//context.lineWidth = 1;

		context.globalAlpha = 0.5;
		context.beginPath();
	
		context.moveTo(endCoords[0].x, endCoords[0].y);
	
		for(var index = 1; index < endCoords.length; index++) {
			context.lineTo(endCoords[index].x, endCoords[index].y);
		}
	
		context.lineTo(endCoords[0].x, endCoords[0].y);
	
		//context.lineJoin = 'round';
		//context.stroke();
	
		context.fillStyle = '#FF0000';
		context.fill();

	}

	// write source code to output area

	updateOutput();

}

// write source code to output area      

function updateOutput() {

if(endCoords.length > 0) {

	$("#txtOutput").html("");
	
	var outputHtml = "";
	
	if($("#radOutputObjC").prop("checked") == true) {
	
		outputHtml = "SKSpriteNode *sprite = [SKSpriteNode spriteNodeWithImageNamed:@\"my-sprite.png\"];\n\n";
		outputHtml += "CGFloat offsetX = sprite.frame.size.width * sprite.anchorPoint.x;\n";
		outputHtml += "CGFloat offsetY = sprite.frame.size.height * sprite.anchorPoint.y;\n\n";
		outputHtml += "CGMutablePathRef path = CGPathCreateMutable();\n\n"
	
	} else {
	
		outputHtml = "var sprite = SKSpriteNode(imageNamed: \"my-sprite.png\")\n\n";
		outputHtml += "var offsetX = CGFloat(sprite.frame.size.width * sprite.anchorPoint.x)\n";
		outputHtml += "var offsetY = CGFloat(sprite.frame.size.height * sprite.anchorPoint.y)\n\n";
		outputHtml += "var path = CGPathCreateMutable()\n\n";
	
	}
	
	var xOutput = 0;
	var yOutput = 0;
	
	for(var index = 0; index < endCoords.length; index++) {
	
		if($("#chkOriginBottomLeft").prop("checked") == true) {
			xOutput = (Math.round(endCoords[index].x) - (canvasWidth / 2) + (imageWidth / 2));
			yOutput = (imageHeight - (Math.round(endCoords[index].y) - (canvasHeight / 2) + (imageHeight / 2)));
		} else {
			xOutput = (Math.round(endCoords[index].x) - (canvasWidth / 2) + (imageWidth / 2));
			yOutput = (Math.round(endCoords[index].y) - (canvasHeight / 2) + (imageHeight / 2));
		}

		if($("#chkRetina").prop("checked") == true) {
			xOutput = Math.round(xOutput / 2);
			yOutput = Math.round(yOutput / 2);
		}

		if(index == 0) {
			if($("#radOutputObjC").prop("checked") == true)
				outputHtml += "CGPathMoveToPoint(path, NULL, " + xOutput + " - offsetX, " + yOutput + " - offsetY);\n";
			else
				outputHtml += "CGPathMoveToPoint(path, nil, " + xOutput + " - offsetX, " + yOutput + " - offsetY)\n";
		} else {
			if($("#radOutputObjC").prop("checked") == true)
				outputHtml += "CGPathAddLineToPoint(path, NULL, " + xOutput + " - offsetX, " + yOutput + " - offsetY);\n";
			else
				outputHtml += "CGPathAddLineToPoint(path, nil, " + xOutput + " - offsetX, " + yOutput + " - offsetY)\n";
	
		}
	}
	
	if($("#radOutputObjC").prop("checked") == true) {
		outputHtml += "\nCGPathCloseSubpath(path);\n\n";
		outputHtml += "sprite.physicsBody = [SKPhysicsBody bodyWithPolygonFromPath:path];";
	} else {
		outputHtml += "\nCGPathCloseSubpath(path)\n\n";
		outputHtml += "sprite!.physicsBody = SKPhysicsBody(polygonFromPath: path)";
	}
	
	$("#txtOutput").html(outputHtml);

}      

}

function isPixelSet(pixelData, x, y) {   

// pick out pixel data from x, y coordinate
//var red = pixelData[((canvasWidth * y) + x) * 4];
//var green = pixelData[((canvasWidth * y) + x) * 4 + 1];
//var blue = pixelData[((canvasWidth * y) + x) * 4 + 2];
var alpha = pixelData[((canvasWidth * y) + x) * 4 + 3];  

if(alpha == 0)  
	return false;

return true;

}

function drawPixel(x, y, colour) {

context.fillStyle = colour;
context.fillRect(x,y,1,1);       

} 

function getEndCoordFromRaycaster(pixelData, x1, y1, x2, y2, colour) {

// equation of a line: y = (m * x) + b

var m = (y2 - y1) / (x2 - x1);
var b = y1 - (m * x1);

var x = 0;
var y = 0;

var dx = 0;
var dy = 0;

//var previousCoord = { "x":0, "y":0 };

if (x1 < x2) {

	for (x = x1; x < x2; x += 0.01) {
	
		dy = Math.round((m * x) + b);
		dx = Math.round(x);
	
		if(!isPixelSet(pixelData, dx, dy)) {   		
			//drawPixel(dx, dy, colour);
			//previousCoord = {"x":dx, "y":dy };
		} else
			return { "x":dx, "y":dy };
			
	}
	
} else if (x1 > x2) {

	for (x = x1; x > x2; x -= 0.01) {
	
		dy = Math.round((m * x) + b);
		dx = Math.round(x);
	
		if(!isPixelSet(pixelData, dx, dy)) {    		
			//drawPixel(dx, dy, colour);
			//previousCoord = { "x":dx, "y":dy };
		} else
			return { "x":dx, "y":dy };
	
	}

} else if (x1 == x2 && y1 < y2) {

	for (y = y1; y < y2; y++) {
	
		if(!isPixelSet(pixelData, x1, y)) {   		
			//drawPixel(x1, y, colour);
			//previousCoord = {"x":x1, "y":y };
		} else
			return { "x":x1, "y":y };
	
	}

} else if (x1 == x2 && y1 > y2) {
	
	for (y = y1; y > y2; y--) {
	
		if(!isPixelSet(pixelData, x1, y)) {    		
			//drawPixel(x1, y, colour);
			//previousCoord = { "x":x1, "y":y };
		} else
			return { "x":x1, "y":y };
	
	}

} else if (x1 == x2 && y1 == y2) {

	if(!isPixelSet(pixelData, x1, y1)) {   		
		//drawPixel(x1, y1, colour);
	} else {
		return {
			"x": x1,
			"y": y1
		};
	}

}

return { "x":0, "y":0 };

}

// Converts from degrees to radians.
function degreesToRadians(degrees) {
return degrees * Math.PI / 180;
};
