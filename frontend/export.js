import React, { useState } from 'react'
import {base, cursor} from '@airtable/blocks'

import {
  useLoadable, useWatchable,
  Box, Text, Heading, TablePicker, ViewPicker
} from '@airtable/blocks/ui'

import SelectedTableExport from '../components/SelectedTableExport'
import SelectedRecordExport from '../components/SelectedRecordExport'

export default function ExportForm () {
  // load selected records and fields
  useLoadable(cursor)
  // re-render whenever the list of selected records or fields changes
  useWatchable(cursor, ['activeTableId', 'selectedRecordIds'])
  const table = base.getTableById(cursor.activeTableId)
  const [selectedTable, setSelectedTable] = useState(null)
  const [selectedView, setSelectedView] = useState(null)

  let selectedRecordId
  if (cursor.selectedRecordIds.length === 1) {
    selectedRecordId = cursor.selectedRecordIds[0]
  }
  return (
    <div style={{padding: '10px'}}>
      <Box
        as='section'
        border='default'
        backgroundColor='white'
        padding={1}
        width='100%'
      >
        <Heading size='small'>Select a Record</Heading>
        {!selectedRecordId &&
          <Text>Select a record from a table with a &quot;Location&quot; field</Text>}
        {selectedRecordId &&
          <SelectedRecordExport table={table} recordId={selectedRecordId} />}
      </Box>
      <div style={{width: '100%', textAlign: 'center'}}>
        <Heading size='small'>OR</Heading>
      </div>
      <Box
        as='section'
        border='default'
        backgroundColor='white'
        padding={1}
        width='100%'
      >
        <Heading size='small'>Select a Table</Heading>
        <Text>Select a table with a Location field</Text>
        <TablePicker
          table={selectedTable}
          onChange={newTable => setSelectedTable(newTable)}
          width='100%'
        />
        <ViewPicker
          table={selectedTable}
          view={selectedView}
          onChange={newView => setSelectedView(newView)}
          width='100%'
        />
        {(selectedTable && selectedView) &&
          <SelectedTableExport table={selectedTable} view={selectedView} />}
      </Box>
    </div>
  )
}
