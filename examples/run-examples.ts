// /examples/run-examples.ts
// Runs all the examples in the current folder.

import process from 'node:process'
import { $ } from 'execa'
import { globby } from 'globby'
import chalk from 'chalk'
import task from 'tasuku'

console.log(chalk.bold.inverse.green(' examples '))
console.log()

const execute = async (files: string[], args: string[]): Promise<boolean> => {
	const tasks = []
	for (const file of files) {
		tasks.push(
			task(file, async ({ setStatus, setOutput, setError }) => {
				try {
					// Run the example file.
					const { stdout } = await $`${args} ${file}`

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
	if (results.find((result) => result.state !== 'success')) return false
	else return true
}

const node = await execute(await globby('node/*.ts'), ['npx', 'tsx'])
const deno = await execute(await globby('deno/*.ts'), [
	'deno',
	'run',
	'--allow-net',
])

if (!node || !deno) process.exit(1)
