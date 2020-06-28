import React, { useState } from 'react'
import distanceCalc from '@turf/distance'
import Promise from 'bluebird'

import {
  useRecords,
  Box, Heading, TablePicker, Text, Button, Tooltip, FieldPicker, Label, Loader, ProgressBar
} from '@airtable/blocks/ui'

export default function AnalysisForm () {
  const [targetTable, setTargetTable] = useState(null)
  const [inputTable, setInputTable] = useState(null)
  const [targetField, setTargetField] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(false)
  const [complete, setComplete] = useState(false)

  const targetRecords = useRecords(targetTable)
  const inputRecords = useRecords(inputTable)

  async function runNearest () {
    setLoading(true)

    // build an array of input records once for faster looping
    const inputFeatures = inputRecords.map(inputRecord => {
      const location = inputRecord.getCellValue('Location')
      const locationParts = location.split(',')
      let inputFeature
      let lat
      let lon
      if (locationParts.length === 2) {
        lat = parseFloat(locationParts[0])
        lon = parseFloat(locationParts[1])
        inputFeature = {
          type: 'Feature',
          properties: {record: inputRecord},
          geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          }
        }
      }
      return inputFeature
    })
    let count = 1
    try {
      await Promise.mapSeries(targetRecords, async (targetRecord) => {
        setProgress(count / targetRecords.length)
        count++
        const location = targetRecord.getCellValue('Location')
        const locationParts = location.split(',')
        let targetFeature
        let lat
        let lon
        if (locationParts.length === 2) {
          lat = parseFloat(locationParts[0])
          lon = parseFloat(locationParts[1])
          targetFeature = {
            type: 'Feature',
            properties: {record: targetRecord},
            geometry: {
              type: 'Point',
              coordinates: [lon, lat]
            }
          }
          let shortestDistanceInputRecord
          let shortestDistance
          inputFeatures.forEach(inputFeature => {
            const distance = distanceCalc(targetFeature.geometry.coordinates, inputFeature.geometry.coordinates)
            if (!shortestDistanceInputRecord || distance < shortestDistance) {
              shortestDistance = distance
              shortestDistanceInputRecord = inputFeature.properties.record
            }
          })
          if (!shortestDistanceInputRecord) {
            throw new Error(`Nearest location not found for ${targetFeature.name}`)
          }
          // now update the record
          const fields = {
            [targetField.id]: [{id: shortestDistanceInputRecord.id}]
          }
          if (targetTable.checkPermissionsForUpdateRecord(targetRecord, fields)) {
            return targetTable.updateRecordAsync(targetRecord, fields)
          } else {
            setError('You need edit permissions for this tasks')
          }
        }
      })
      setComplete(true)
    } catch (err) {
      setError(err.message)
    }
  }
  return (
    <div style={{padding: '10px'}}>
      {error &&
        <Box
          display='flex'
          alignItems='center'
          justifyContent='center'
          border='thick'
          backgroundColor='white'
          borderRadius='large'
          borderColor='red'
          padding={0}
          height={100}
          overflow='auto'
        >
          <Text>Error: {error}</Text>
        </Box>}
      <Box>
        <Heading>Nearest Location</Heading>
        <div style={{margin: '10px'}}>
          <Label>Target Table</Label>
          <TablePicker
            table={targetTable}
            onChange={newTable => setTargetTable(newTable)}
            width='100%'
          />
        </div>
        <div style={{margin: '10px'}}>
          <Label>Input Table</Label>
          <TablePicker
            table={inputTable}
            onChange={newTable => setInputTable(newTable)}
            width='100%'
          />
        </div>
      </Box>
      {(targetTable && inputTable) &&
        <>
          <Box>
            <div style={{margin: '10px'}}>
              <Label htmlFor='field-name'>Linked Field</Label>
              <Tooltip
                content='Must be linked to the selected Input Table'
                placementX={Tooltip.placements.CENTER}
                placementY={Tooltip.placements.BOTTOM}
                shouldHideTooltipOnClick
              >
                <FieldPicker
                  field={targetField}
                  table={targetTable}
                  onChange={newField => setTargetField(newField)}
                  width='100%'
                />
              </Tooltip>
            </div>
          </Box>
          <div style={{margin: '10px'}}>
            <Button
              onClick={runNearest}
              variant='primary'
              size='large'
              icon='play'
              disabled={loading}
            >
              Run
            </Button>
          </div>
          {(loading && !complete) &&
            <Box
              display='flex'
              alignItems='center'
              justifyContent='center'
            >
              <Loader scale={0.3} />
              <ProgressBar
                progress={progress}
                barColor='#ff9900'
              />
            </Box>}
          {complete &&
            <div>
              <Text>Process Complete!</Text>
              <Button
                onClick={() => console.log('Button clicked')}
                icon='redo'
              >
                Reset
              </Button>
            </div>}
        </>}
    </div>
  )
}
