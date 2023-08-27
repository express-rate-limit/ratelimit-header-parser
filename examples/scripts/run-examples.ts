// /examples/run-examples.ts
// Runs all the examples in the current folder.

import process from 'node:process'
import { $ } from 'execa'
import { globby } from 'globby'
import chalk from 'chalk'
import task from 'tasuku'

console.log(chalk.bold.inverse.green(' examples '))
console.log()

// Collect all the examples.
const files = await globby('*.example.ts')
const tasks = []
for (const file of files) {
	tasks.push(
		task(file, async ({ setStatus, setOutput, setError }) => {
			try {
				// Run the example file with `tsx`.
				const { stdout } = await $`npx tsx ${file}`

				setStatus('passed')
				setOutput(stdout.replace(/\n/, '\n  ')) // Align the output correctly.
			} catch (error) {
				// Display the error.
				setStatus('failed')
				setError(error)
			}
		}),
	)
}

// Run all the examples, concurrently.
const results = await Promise.all(tasks)
// If any example hasn't run succesfully, fail the test.
if (results.find((result) => result.state !== 'success')) process.exit(1)
