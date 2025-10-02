function generateNewCanvas(size=16) {
    const gridSize = Number(size);
    if (Number.isInteger(gridSize) && gridSize > 0 && gridSize < 101) {
        const gridContainer = document.querySelector("#canvas");
        gridContainer.innerHTML="";

        rows: for (let i = 0; i < gridSize; i++) {
            let rowDiv = document.createElement("div");
            rowDiv.classList.add("row");

            pixels: for (let j = 0; j < gridSize; j++) {
                let newPixel = document.createElement("div");
                newPixel.classList.add("pixel");
                // newPixel.textContent = i*gridSize + j+1;
                newPixel.onmouseover = () => newPixel.style.backgroundColor = "black";
                rowDiv.appendChild(newPixel);
            }

            gridContainer.appendChild(rowDiv);
        }
    } else {
        alert("Invalid Input: Use a Number between 1 and 100");
    }
}

const btnGenerateNewCanvas = document.querySelector("#new-canvas-btn");

// btnGenerateNewCanvas.addEventListener(
//     "click", () => {
//         const textField = document.querySelector("#amount-of-pixels");
//         const input = textField.textContent;
//         generateNewCanvas(input);
//     }
// )

btnGenerateNewCanvas.onclick = () => {
        const textField = document.querySelector("#amount-of-pixels");
        const input = textField.value;
        console.log("Input Field:", input);
        generateNewCanvas(input);
};

generateNewCanvas();