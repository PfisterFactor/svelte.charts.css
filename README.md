# Svelte Charts.CSS

This is a port of [vue.charts.css](https://github.com/Vue-Charts-CSS/vue.charts.css) for use in Svelte rather than Vue.

The API is mostly the same, so you should be able to refer to their documentation for usage.

## Dependencies

+ [Charts.css](https://github.com/ChartsCSS/charts.css)
+ [Svelte](https://svelte.dev/)

## Install

### With Package Managers

NPM
```
npm install charts.css svelte.charts.css
```

## Documentation

For in depth documentation please adapt the vue.charts.css [documentation](https://vue-charts-css.github.io/docs/). The API should be mostly the same, just with Svelte instead of Vue.

### Example
```svelte
<script>
  let datasets = [
    {
        name: "Ben",
        values: [2, 4, 3],
    },
    {
        name: "Josie",
        values: [7, 6, 3, 4],
    },
    {
        name: "Tim",
        values: [12, 278, 0, 0],
    },
  ],
</script>

<SvelteChartCss
    heading = "Team's Coffee Count"
    type = "bar"
    labels = { ["Mon", "Tue", "Wed"] }
    datasets = { datasets }
/>
```

## License

**Svelte Charts.CSS** and **Charts.CSS** are licensed under the [MIT license](https://opensource.org/licenses/MIT).

**Svelte Charts.CSS** is not affiliated with the creators of **Charts.CSS**.
