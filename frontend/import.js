import React, { useState } from 'react'
import {Input, Text, Loader, ProgressBar, Label, Button, Box, Select} from '@airtable/blocks/ui'
import {base} from '@airtable/blocks'
import {FieldType} from '@airtable/blocks/models'
import shp from 'shpjs'
import turfCentroid from '@turf/centroid'
import Promise from 'bluebird'

export default function ImportForm () {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [geojson, setGeoJSON] = useState()
  const [tableName, setTableName] = useState()
  const [nameField, setNameField] = useState()
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState(false)

  async function handleShpFile (file) {
    setLoading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      if (reader.readyState !== 2 || reader.error) {
        return
      } else {
        try {
          const geojson = await shp(reader.result)
          console.log(geojson)
          setGeoJSON(geojson)
        } catch (err) {
          console.error(err)
          setError(err.message)
        }
      }
      setLoading(false)
    }
    reader.onerror = () => {
      console.error(reader.error)
      reader.abort()
      setError(reader.error.message)
      setLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleGeoJSONFile (file) {
    const reader = new FileReader()
    setLoading(true)
    reader.onload = (e) => {
      const data = JSON.parse(e.target.result)
      setGeoJSON(data)
      setLoading(false)
    }

    reader.onerror = () => {
      console.error(reader.error)
      reader.abort()
      setError(reader.error.message)
      setLoading(false)
    }

    reader.readAsText(file)
  }

  async function createTable () {
    const fields = []
    // id field
    fields.push({
      name: nameField,
      type: FieldType.SINGLE_LINE_TEXT
    })
    // data fields
    const firstFeature = geojson.features[0]
    Object.keys(firstFeature.properties).forEach(key => {
      if (key !== nameField) {
        if (key === 'Location' || key === 'location') key = 'Location_Orig'
        fields.push({
          name: key,
          type: FieldType.SINGLE_LINE_TEXT
        })
      }
    })

    // location fields
    /*
    fields.push({
      name: 'Geometry',
      type: FieldType.MULTILINE_TEXT
    })
    */
    fields.push({
      name: 'Location',
      type: FieldType.SINGLE_LINE_TEXT
    })
    fields.push({
      name: 'Cache', // required by default AirTable Map Block
      type: FieldType.SINGLE_LINE_TEXT
    })

    setLoading(true)

    try {
      if (base.unstable_hasPermissionToCreateTable(tableName, fields)) {
        const table = await base.unstable_createTableAsync(tableName, fields)
        // now insert the data
        // split data into 50 records blocks for bulk import
        const blocks = []
        for (var i = 0; i < geojson.features.length; i += 50) {
          const start = i
          let end = i + 50
          if (end > geojson.features.length) end = geojson.features.length
          const block = geojson.features.slice(start, end)
          blocks.push(block)
        }
        // insert each block
        let count = 1
        await Promise.mapSeries(blocks, async (block) => {
          setProgress(count / blocks.length)
          count = count + 1
          const records = block.map(feature => {
            let featureCentroid = feature
            if (feature.geometry.type !== 'Point') {
              // convert polygons to centroids
              featureCentroid = turfCentroid(feature)
            }
            // get coords
            let coords
            if (featureCentroid) {
              coords = featureCentroid.geometry.coordinates
            }

            const recordData = {}
            Object.keys(feature.properties).forEach(key => {
              let value = feature.properties[key]
              if (typeof value === 'object') {
                value = JSON.stringify(value)
              } else if (typeof value !== 'string') {
                value = value.toString()
              }
              if (value) {
                if (key === 'Location' || key === 'location') key = 'Location_Orig'
                recordData[key] = value
              }
            })
            // recordData["Geometry"] = JSON.stringify(feature.geometry)
            recordData.Location = coords ? `${coords[1]},${coords[0]}` : ''
            return {
              fields: recordData
            }
          })
          return table.createRecordsAsync(records)
        })
        setComplete(true)
      } else {
        setError(`You do not have permission to create table: ${tableName}`)
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
    setLoading(false)
  }

  let nameFieldOptions
  if (geojson) {
    const firstFeature = geojson.features[0]
    nameFieldOptions = Object.keys(firstFeature.properties).map(key => {
      return {
        value: key, label: key
      }
    })
  }

  return (
    <div style={{height: '200px', width: '100%', padding: 20}}>
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
      {(!geojson && !loading) &&
        <Box>
          <Label htmlFor='map-data-import'>Upload a Shapefile (.zip) or GeoJSON (.geojson)</Label>
          <Input
            id='map-data-import' type='file' onChange={() => {
              const selectedFile = document.getElementById('map-data-import').files[0]
              const fileNameParts = selectedFile.name.split('.')
              const fileNameWithoutExt = fileNameParts[0]
              const ext = fileNameParts[1]
              setTableName(fileNameWithoutExt)
              if (ext === 'zip') {
                handleShpFile(selectedFile)
              } else if (ext === 'geojson') {
                handleGeoJSONFile(selectedFile)
              } else {
                setError(`Unsupported File Type: ${ext}`)
              }
            }}
          />
        </Box>}

      {(geojson && !complete) &&
        <div>
          <div style={{margin: '10px'}}>
            <Box>
              <Label htmlFor='table-name-input'>Table Name</Label>
              <Input
                id='table-name-input' value={tableName} onChange={(e) => {
                  const value = e.target.value
                  setTableName(value)
                }}
              />
              <Text>{geojson.features.length} records will be imported to this table</Text>
            </Box>
          </div>
          <div style={{margin: '10px'}}>
            <Label htmlFor='name-field'>Select a name field</Label>
            <Select
              id='name-field'
              options={nameFieldOptions}
              value={nameField}
              onChange={newValue => setNameField(newValue)}
              width='320px'
            />
          </div>
          <div style={{margin: '10px'}}>
            <Button
              onClick={() => {
                createTable(tableName, geojson, setComplete, setLoading)
              }}
              variant='primary'
              size='large'
              icon='upload'
              disabled={loading}
            >
              Import
            </Button>
          </div>
          {loading &&
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
        </div>}
      {complete &&
        <div>
          <Text>Import Complete!</Text>
          <Button
            onClick={() => console.log('Button clicked')}
            icon='redo'
          >
            Import a New File
          </Button>
        </div>}
    </div>
  )
}
