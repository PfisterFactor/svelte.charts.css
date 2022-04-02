<script>
	import SvelteChartCss from "../../src/SvelteChartCss.svelte"
	import "charts.css"
	let types = ['column', 'bar', 'line', 'area'];
	let type = "column";
	let heading = "Team's coffee count";
	let dataSpacing = 20;
	let showHeading = true;
	let showLegend = true;
	let showLabels = true;
	let showTooltips = false;
	let reverse = false;
	let labels = ["Mon","Tue","Wed"];
	let datasets = [];

	/**
	 * Used to demonstrate a JSON stringified version of the datasets and labels.
	 * @return {string}
	 */
	$: stringifiedDatasetsAndLabels = function() {
		const value = {
                    datasets: datasets,
                    labels: labels,
                };
                return JSON.stringify(value, null, 4);
	}();
	/**
             * Allow the user to update the label at the given index.
             * @param labelIndex
             * @param newValue
             */
			function updateLabel(labelIndex, newValue)
            {
                labels[labelIndex] = newValue;
            };

            /**
             * Allow the user to update the dataset value at the given index.
             * @param datasetIndex
             * @param valueIndex
             * @param newValue
             */
            function updateDatasetValue(datasetIndex, valueIndex, newValue)
            {
                let dataset = datasets[datasetIndex];
                dataset.values[valueIndex] = newValue;
                datasets[datasetIndex] = dataset;
            };

            /**
             * Add a new generated dataset to the chart.
             */
            function addDataset()
            {
                datasets.push({
                    name: generateName(),
                    values: [generateNumber(), generateNumber(), generateNumber(),],
                });
				datasets = datasets;
            };

            /**
             * Remove a dataset from the chart.
             */
            function removeDataset()
            {
                datasets = datasets.slice(1);
            };

            /**
             * Randomizes the values of every dataset.
             */
            function randomizeDatasets()
            {
                for (let datasetIndex = 0; datasetIndex < datasets.length; datasetIndex++){
                    let dataset = datasets[datasetIndex];
                    dataset.values = dataset.values.map(value => generateNumber());
                    datasets[datasetIndex] = dataset;
                }
            };

            /**
             * Returns a random human name
             * @return {string}
             */
            function generateName()
            {
                const randomNames = [
                    "Genaro",
                    "Zandra",
                    "Nancey",
                    "Jeannette",
                    "Michel",
                    "Kacey",
                    "Essie",
                    "Kristi",
                    "Manuel",
                    "Cherrie",
                    "Dollie",
                    "Jordon",
                    "Cathie",
                    "Latoyia",
                    "Herlinda",
                ];
                return randomNames[Math.floor(Math.random() * randomNames.length)];
            };

            /**
             * Returns a random number between 1 and 100.
             * @return {number}
             */
            function generateNumber()
            {
                return Math.max(1, Math.round(Math.random() * 100));
            };


        
        addDataset();
        addDataset();
        addDataset();
        
</script>
<div>
	<h1>
		<a target="_blank" href="https://github.com/PfisterFactor/svelte.charts.css">Svelte Charts.CSS</a> Playground
	</h1>

	<div class="options">
		<div>
			<input id="showHeading" type="checkbox" bind:checked={showHeading} />
			<label for="showHeading">show-heading</label>
		</div>
		<div>
			<input id="showLegend" type="checkbox" bind:checked={showLegend} />
			<label for="showLegend">show-legend</label>
		</div>
		<div>
			<input id="showLabels" type="checkbox" bind:checked={showLabels} />
			<label for="showLabels">show-labels</label>
		</div>
		<div>
			<input id="showTooltips" type="checkbox" bind:checked={showTooltips} />
			<label for="showTooltips">show-tooltips</label>
		</div>
		<div>
			<input id="reverse" type="checkbox" bind:checked={reverse} />
			<label for="reverse">reverse</label>
		</div>
		<div>
			<input id="dataSpacing" type="number" min="0" max="20" bind:value={dataSpacing} />
			<label for="dataSpacing">data-spacing</label>
		</div>
		<div>
			<input id="heading" type="text" bind:value = {heading} />
			<label for="heading">heading</label>
		</div>
	</div>

	<div class="buttons-wrapper">
		<button on:click={addDataset}>Add Dataset</button>
		<button on:click={removeDataset}>Remove Dataset</button>
		<button on:click={randomizeDatasets}>Randomize Datasets</button>
	</div>

	<h2>{ type } Chart</h2>

	<div class="buttons-wrapper">
		{#each types as availableType,index (availableType)}
		<button
		on:click={() => type = availableType}
		disabled={type === availableType}
	>
		{ availableType }
	</button>
		{/each}
		
	</div>

	<br>

	<SvelteChartCss
			type={type}
			heading={heading}
			labels={labels}
			datasets={datasets}
			dataSpacing={dataSpacing}
			showHeading={showHeading}
			showLegend={showLegend}
			showLabels={showLabels}
			showTooltips={showTooltips}
			reverse={reverse}
		>
		<div slot = "heading">
			<input type="text" bind:value={heading}>
		</div>

		<div slot = "label" let:labelIndex let:label>
			<input
				class="label"
				type="text"
				value={label}
				on:input={(e) => updateLabel(labelIndex, e.target.value)}
				style="width: {label.length + 6}ch"
			>
		</div>

		<div slot = "data" let:value>
			<input
				class="data-number"
				type="number"
				value={value.valueRaw}
				on:input={(e) => updateDatasetValue(value.datasetIndex, value.valueIndex, e.target.value)}
				min="1"
			>
		</div>
		</SvelteChartCss>

	<div style="width: 100%; display: flex;">
		<textarea
			value={stringifiedDatasetsAndLabels}
			rows={stringifiedDatasetsAndLabels.split('\n').length}
			readonly
		/>
	</div>
</div>


