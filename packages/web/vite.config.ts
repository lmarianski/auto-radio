import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	define: { 'process.env': {} },
	// build: {
	// 	target: 'esnext'
	// }
	/* remove the need to specify .vue files https://vitejs.dev/config/#resolve-extensions
	resolve: {
		extensions: [
			'.js',
			'.json',
			'.jsx',
			'.mjs',
			'.ts',
			'.tsx',
			'.vue',
		]
	},
	*/
})
