import {initializeBlock, SelectButtons} from '@airtable/blocks/ui'
import React, { useState } from 'react'
import ImportForm from './import'
import ExportForm from './export'
import AnalysisForm from './analysis'

const options = [
  { value: 'import', label: 'Import' },
  { value: 'export', label: 'Export' },
  { value: 'analysis', label: 'Analysis' }
]

function MapDataBlock () {
  const [value, setValue] = useState(options[0].value)
  return (
    <div>
      <SelectButtons
        value={value}
        onChange={newValue => setValue(newValue)}
        options={options}
        width='320px'
        style={{margin: 'auto', textAlign: 'center'}}
      />
      {value === 'import' &&
        <ImportForm />}
      {value === 'export' &&
        <ExportForm />}
      {value === 'analysis' &&
        <AnalysisForm />}
    </div>
  )
}

initializeBlock(() => <MapDataBlock />)
